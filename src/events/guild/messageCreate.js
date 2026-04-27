// src/events/guild/messageCreate.js
// Responsável pelo ganho de XP por mensagem e rastreamento de parcerias
const { EmbedBuilder } = require('discord.js');
const xpManager = require('@utils/managers/xpManager');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');
const Guild = require('@models/Guild');
const PartnershipTrack = require('@models/PartnershipTrack');
const autoResponseManager = require('@utils/managers/autoResponseManager');

// Regex para detectar convites do Discord
const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[\w-]+/i;

// Cooldown de XP por usuário (evita farm)
const xpCooldowns = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // ── Rolador de Dados automático (D&D / RPG) ───────────
        const diceRegex = /(?:\b|^)(\d*)d(\d+)\b/gi;
        let match;
        const rolls = [];

        // Parse matches up to a safe limit
        while ((match = diceRegex.exec(message.content)) !== null) {
            const amount = parseInt(match[1]) || 1; // e.g. "d20" implies 1d20
            const sides = parseInt(match[2]);

            // Sanity limits to prevent abuse/lag
            if (amount > 0 && amount <= 50 && sides > 1 && sides <= 1000) {
                rolls.push({ amount, sides });
            }
            if (rolls.length >= 5) break; // Max 5 different dice expressions per msg
        }

        if (rolls.length > 0) {
            let totalSum = 0;
            let description = '';

            for (const roll of rolls) {
                let currentSum = 0;
                const results = [];
                for (let i = 0; i < roll.amount; i++) {
                    const res = Math.floor(Math.random() * roll.sides) + 1;
                    results.push(res);
                    currentSum += res;
                }
                totalSum += currentSum;
                const resultsStr = results.length > 10 ? `${results.slice(0, 10).join(', ')}... (+${results.length - 10})` : results.join(', ');
                description += `🎲 **${roll.amount}d${roll.sides}**: [${resultsStr}] = **${currentSum}**\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(PALETTE.accent)
                .setTitle(`🎲 Rolagem de ${message.author.username}`)
                .setDescription(description)
                .addFields({ name: 'Total Ofertado', value: `**${totalSum}**` })
                .setFooter(tengokuFooter());

            await message.reply({ embeds: [embed] }).catch(() => null);
        }

        // ── Auto Respostas (Verificação Otimizada via Cache) ──
        await autoResponseManager.handleMessage(message);

        // ── Rastreamento de Parcerias ─────────────────────────
        await trackPartnership(message).catch(() => null);

        // ── Incrementar contagem de mensagens ─────────────────
        const UserData = require('@models/UserData');
        const userData = await UserData.findOneAndUpdate(
            { userId: message.author.id, guildId: message.guild.id },
            { $inc: { 'stats.messages': 1 } },
            { upsert: true, returnDocument: 'after' }
        ).catch(() => null);

        if (userData?.afkData?.isAfk) {
            userData.afkData.isAfk = false;
            await userData.save().catch(() => null);
            message.reply(`👋 Bem-vindo de volta, ${message.author}! Seu status AFK foi removido.`).catch(() => null);
        }

        if (message.mentions.users.size > 0) {
            const mentionedIds = Array.from(message.mentions.users.keys());
            const validMentions = mentionedIds.filter(id => id !== message.author.id && !message.mentions.users.get(id).bot);

            if (validMentions.length > 0) {
                const afkUsers = await UserData.find({
                    guildId: message.guild.id,
                    userId: { $in: validMentions },
                    'afkData.isAfk': true
                });

                for (const afkU of afkUsers) {
                    // Safe access in case since isn't properly saved
                    const sinceTime = afkU.afkData.since ? afkU.afkData.since.getTime() : Date.now();
                    const timeAgo = Math.floor(sinceTime / 1000);
                    message.reply(`💤 **${message.mentions.users.get(afkU.userId).username}** está AFK: \`${afkU.afkData.reason || 'AFK'}\` (ausente <t:${timeAgo}:R>)`).catch(() => null);
                }
            }
        }

        const guildId = message.guild.id;
        const userId  = message.author.id;
        const config  = await xpManager.getConfig(guildId);

        if (!config.enabled) return;

        // Cooldown de XP
        const cooldownKey = `${guildId}:${userId}`;
        const now = Date.now();
        const cooldown = (config.cooldownSeconds || 60) * 1000;

        if (xpCooldowns.has(cooldownKey)) {
            const lastXP = xpCooldowns.get(cooldownKey);
            if (now - lastXP < cooldown) return;
        }

        xpCooldowns.set(cooldownKey, now);

        // Limpa cooldowns antigos periodicamente
        if (xpCooldowns.size > 2000) {
            for (const [key, time] of xpCooldowns.entries()) {
                if (now - time > cooldown * 2) xpCooldowns.delete(key);
            }
        }

        // Calcula XP ganho
        const min = config.minChatXp || 5;
        const max = config.maxChatXp || 15;
        const xpGain = Math.floor(Math.random() * (max - min + 1)) + min;
        const result = await xpManager.addXP(userId, guildId, xpGain);

        if (result.leveledUp) {
            await handleLevelUp(message, result, config, guildId);
        }
    },
};

async function handleLevelUp(message, result, config, guildId) {
    // Notificação de level up
    const channel = config.notificationChannel
        ? (message.guild.channels.cache.get(config.notificationChannel) || message.channel)
        : message.channel;
    const branding = await brandingManager.get(guildId);

    const levelMsg = (config.levelUpMessage || '{user} subiu para o nível **{level}**! 🎉')
        .replace(/{user}/g, message.author.toString())
        .replace(/{level}/g, result.newLevel)
        .replace(/{username}/g, message.author.username);

    const embed = new EmbedBuilder()
        .setColor(branding.accent || PALETTE.accent)
        .setDescription(levelMsg)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter(tengokuFooter())
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);

    // Cargo de recompensa por nível via xpManager
    await xpManager.updateMemberRole(message.member).catch(() => null);
}

// ── Rastreamento de Parcerias da Staff ────────────────────────
async function trackPartnership(message) {
    const guildId = message.guild.id;
    const guildDoc = await Guild.findOne({ guildId });
    const cfg = guildDoc?.partnershipsConfig;

    // Verifica se o sistema está ativo e se a mensagem é no canal de análise
    if (!cfg?.enabled || !cfg.analysisChannel) return;
    if (message.channel.id !== cfg.analysisChannel) return;

    // Verifica se a mensagem contém um convite do Discord
    if (!INVITE_REGEX.test(message.content)) return;

    // Verifica se o autor é da staff (se o cargo de staff estiver configurado)
    if (cfg.staffRole) {
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member || !member.roles.cache.has(cfg.staffRole)) return;
    }

    // Incrementa contagem de parcerias do membro
    await PartnershipTrack.findOneAndUpdate(
        { guildId, userId: message.author.id },
        { $inc: { count: 1 } },
        { upsert: true, returnDocument: 'after' }
    );
}
