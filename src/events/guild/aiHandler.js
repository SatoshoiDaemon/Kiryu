// src/events/guild/aiHandler.js
// ============================================================
//   Tengoku Community Bot — Handler de IA (Gemini)
// ============================================================

const { EmbedBuilder } = require('discord.js');
const Guild = require('@models/Guild');
const AIMemory = require('@models/AIMemory');
const logger = require('@utils/logger');

let genAI = null;

try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
} catch {
    logger.warn('⚠️ Pacote @google/generative-ai não instalado. IA desativada.');
}

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const guildDoc = await Guild.findOne({ guildId });
        if (!guildDoc) return;

        const cfg = guildDoc.aiConfig;
        if (!cfg?.enabled) return;

        // Verifica se é o canal correto (se configurado)
        if (cfg.responseChannel && message.channel.id !== cfg.responseChannel) return;

        // Verifica se precisa ser mencionado
        if (cfg.mentionOnly && !message.mentions.has(client.user.id)) return;

        // API Key do servidor ou global
        const apiKey = cfg.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) return;

        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ model: 'gemini-flash-latest' });

            // Busca histórico de memória
            let history = [];
            if (cfg.keepMemory) {
                const memories = await AIMemory.find({ guildId, userId: message.author.id })
                    .sort({ createdAt: -1 })
                    .limit(20);

                history = memories.reverse().map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }]
                }));
            }

            // System instruction
            const systemInstruction = cfg.systemInstruction ||
                'Você é o assistente do servidor Discord. Responda de forma útil, amigável e em português brasileiro. Seja conciso.';

            // Inicia chat
            const chat = model.startChat({
                history,
                systemInstruction: { parts: [{ text: systemInstruction }] },
            });

            // Remove a menção do bot do conteúdo
            const content = message.content
                .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
                .trim();

            if (!content) return;

            // Indica que está digitando
            await message.channel.sendTyping();

            const result = await chat.sendMessage(content);
            const responseText = result.response.text();

            if (!responseText) return;

            // Salva no histórico
            if (cfg.keepMemory) {
                await AIMemory.create({ guildId, userId: message.author.id, role: 'user', content });
                await AIMemory.create({ guildId, userId: message.author.id, role: 'model', content: responseText });

                // Limita a memória a 50 mensagens por usuário
                const count = await AIMemory.countDocuments({ guildId, userId: message.author.id });
                if (count > 50) {
                    const oldest = await AIMemory.find({ guildId, userId: message.author.id })
                        .sort({ createdAt: 1 })
                        .limit(count - 50);
                    const ids = oldest.map(m => m._id);
                    await AIMemory.deleteMany({ _id: { $in: ids } });
                }
            }

            // Responde (divide se muito longo)
            if (responseText.length <= 2000) {
                await message.reply({ content: responseText, allowedMentions: { repliedUser: false } });
            } else {
                // Divide em partes de 2000 caracteres
                const parts = responseText.match(/[\s\S]{1,2000}/g) || [];
                for (const part of parts) {
                    await message.channel.send({ content: part });
                }
            }
        } catch (err) {
            logger.error(`Erro na IA: ${err.message}`);
            await message.reply({ content: '❌ Ocorreu um erro ao processar sua mensagem com a IA.', allowedMentions: { repliedUser: false } }).catch(() => null);
        }
    },
};
