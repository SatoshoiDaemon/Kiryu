// src/events/guild/starboardHandler.js
// ============================================================
//   Olympus Community Bot — Handler de Starboard
//   Envia mensagens populares para o canal de starboard
// ============================================================

const { EmbedBuilder } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const logger = require('@utils/logger');

// Cache de mensagens já enviadas ao starboard (messageId -> starboardMessageId)
const starboardCache = new Map();

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        // Ignora reações de bots
        if (user.bot) return;

        // Busca a reação completa se parcial
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch {
                return;
            }
        }

        // Busca a mensagem completa se parcial
        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch {
                return;
            }
        }

        const message = reaction.message;
        if (!message.guild) return;

        const guildId = message.guild.id;
        const guildDoc = await Guild.findOne({ guildId });
        const cfg = guildDoc?.starboardConfig;

        if (!cfg?.enabled || !cfg.channelId) return;

        // Verifica se é o emoji correto
        const starEmoji = cfg.emoji || '⭐';
        const reactionEmoji = reaction.emoji.name || reaction.emoji.toString();
        if (reactionEmoji !== starEmoji && reaction.emoji.toString() !== starEmoji) return;

        // Não permite estrelar mensagens no próprio canal do starboard
        if (message.channel.id === cfg.channelId) return;

        const starChannel = message.guild.channels.cache.get(cfg.channelId);
        if (!starChannel) return;

        const minStars = cfg.minStars || 5;
        const starCount = reaction.count;

        if (starCount < minStars) return;

        // Monta o embed
        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL(),
            })
            .setDescription(message.content || '*Sem conteúdo de texto*')
            .addFields(
                { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Link', value: `[Ir para a mensagem](${message.url})`, inline: true },
            )
            .setFooter(olympusFooter(`${starEmoji} ${starCount}`))
            .setTimestamp(message.createdAt);

        // Adiciona imagem se houver
        const attachment = message.attachments.first();
        if (attachment && attachment.contentType?.startsWith('image/')) {
            embed.setImage(attachment.url);
        }

        const content = `${starEmoji} **${starCount}** | <#${message.channel.id}>`;

        try {
            // Verifica se já existe no starboard
            const existingId = starboardCache.get(message.id);
            if (existingId) {
                // Atualiza a mensagem existente
                const existingMsg = await starChannel.messages.fetch(existingId).catch(() => null);
                if (existingMsg) {
                    await existingMsg.edit({ content, embeds: [embed] });
                    return;
                }
            }

            // Envia nova mensagem
            const starMsg = await starChannel.send({ content, embeds: [embed] });
            starboardCache.set(message.id, starMsg.id);

            // Limpa cache antigo
            if (starboardCache.size > 500) {
                const entries = [...starboardCache.entries()];
                for (let i = 0; i < 100; i++) {
                    starboardCache.delete(entries[i][0]);
                }
            }
        } catch (err) {
            logger.error(`Erro no starboard: ${err.message}`);
        }
    },
};
