// src/events/guild/logEvents.js
// ============================================================
//   Olympus Community Bot — Logs Avançados
//   messageDelete, messageUpdate, voiceStateUpdate, invites
// ============================================================

const { EmbedBuilder, Events } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const logger = require('@utils/logger');

// Cache de guild configs para evitar queries excessivas
const configCache = new Map();
const CACHE_TTL = 30_000;

async function getLogsConfig(guildId) {
    const cached = configCache.get(guildId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.cfg;

    const doc = await Guild.findOne({ guildId });
    const cfg = doc?.logsConfig || {};
    configCache.set(guildId, { cfg, ts: Date.now() });
    return cfg;
}

module.exports = [
    // ── Mensagem Deletada ─────────────────────────────────────
    {
        name: Events.MessageDelete,
        async execute(message) {
            if (!message.guild || message.author?.bot) return;
            const cfg = await getLogsConfig(message.guild.id);
            if (!cfg.deleteChannel) return;

            const channel = message.guild.channels.cache.get(cfg.deleteChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(PALETTE.error)
                .setTitle('🗑️ Mensagem Apagada')
                .addFields(
                    { name: 'Autor', value: `${message.author || 'Desconhecido'} (\`${message.author?.id || '?'}\`)`, inline: true },
                    { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Conteúdo', value: message.content ? `\`\`\`${message.content.substring(0, 1000)}\`\`\`` : '`(sem conteúdo ou embed)`', inline: false },
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            if (message.attachments.size > 0) {
                embed.addFields({ name: '📎 Anexos', value: message.attachments.map(a => a.url).join('\n').substring(0, 1024), inline: false });
            }

            await channel.send({ embeds: [embed] }).catch(() => null);
        }
    },

    // ── Mensagem Editada ──────────────────────────────────────
    {
        name: Events.MessageUpdate,
        async execute(oldMessage, newMessage) {
            if (!newMessage.guild || newMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return;
            const cfg = await getLogsConfig(newMessage.guild.id);
            if (!cfg.editChannel) return;

            const channel = newMessage.guild.channels.cache.get(cfg.editChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(PALETTE.warning)
                .setTitle('✏️ Mensagem Editada')
                .addFields(
                    { name: 'Autor', value: `${newMessage.author} (\`${newMessage.author.id}\`)`, inline: true },
                    { name: 'Canal', value: `<#${newMessage.channel.id}>`, inline: true },
                    { name: 'Antes', value: `\`\`\`${(oldMessage.content || '(vazio)').substring(0, 500)}\`\`\``, inline: false },
                    { name: 'Depois', value: `\`\`\`${(newMessage.content || '(vazio)').substring(0, 500)}\`\`\``, inline: false },
                    { name: '🔗 Link', value: `[Ir à mensagem](${newMessage.url})`, inline: false },
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            await channel.send({ embeds: [embed] }).catch(() => null);
        }
    },

    // ── Tráfego de Voice ──────────────────────────────────────
    {
        name: Events.VoiceStateUpdate,
        async execute(oldState, newState) {
            const guild = newState.guild || oldState.guild;
            if (!guild) return;

            const cfg = await getLogsConfig(guild.id);
            if (!cfg.voiceChannel) return;

            const channel = guild.channels.cache.get(cfg.voiceChannel);
            if (!channel) return;

            const member = newState.member || oldState.member;
            if (!member || member.user.bot) return;

            let action, color, voiceChannel;
            if (!oldState.channelId && newState.channelId) {
                action = '🟢 Entrou'; color = PALETTE.success; voiceChannel = newState.channel;
            } else if (oldState.channelId && !newState.channelId) {
                action = '🔴 Saiu'; color = PALETTE.error; voiceChannel = oldState.channel;
            } else if (oldState.channelId !== newState.channelId) {
                action = '🔄 Mudou de canal'; color = PALETTE.info; voiceChannel = newState.channel;
            } else {
                return; // Mute/deafen, ignorar
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🎙️ ${action}`)
                .setDescription(`${member} ${action.toLowerCase()} ${voiceChannel ? `<#${voiceChannel.id}>` : 'um canal de voz'}`)
                .setFooter(olympusFooter())
                .setTimestamp();

            await channel.send({ embeds: [embed] }).catch(() => null);
        }
    },

    // ── Invite criado/deletado ────────────────────────────────
    {
        name: Events.InviteCreate,
        async execute(invite) {
            if (!invite.guild) return;
            const cfg = await getLogsConfig(invite.guild.id);
            if (!cfg.inviteChannel) return;

            const channel = invite.guild.channels.cache.get(cfg.inviteChannel);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('📨 Invite Criado')
                .addFields(
                    { name: 'Código', value: `\`${invite.code}\``, inline: true },
                    { name: 'Criador', value: `${invite.inviter || 'Desconhecido'}`, inline: true },
                    { name: 'Canal', value: `<#${invite.channel?.id || '?'}>`, inline: true },
                    { name: 'Máx. Usos', value: `${invite.maxUses || '∞'}`, inline: true },
                    { name: 'Expira', value: invite.maxAge ? `<t:${Math.floor(Date.now() / 1000) + invite.maxAge}:R>` : 'Nunca', inline: true },
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            await channel.send({ embeds: [embed] }).catch(() => null);
        }
    },
];
