// src/utils/helpers/modHelper.js
// ============================================================
//   Tengoku Community Bot — Helper de Moderação
// ============================================================

const ModLog = require('@models/ModLog');
const Guild = require('@models/Guild');
const { EmbedBuilder } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const logger = require('@utils/logger');

/**
 * Registra uma ação de moderação no banco de dados e no canal de logs.
 * @param {Object} options Opções do log de moderação
 * @returns {Promise<Object>} Documento do log criado
 */
async function createModLog({ guildId, moderatorId, targetId, action, reason, duration, guild }) {
    try {
        // Busca configurações do servidor
        const guildDoc = await Guild.findOne({ guildId });
        const modConfig = guildDoc?.modConfig || {};

        // Busca o último case number
        const lastLog = await ModLog.findOne({ guildId }).sort({ caseNumber: -1 });
        const caseNumber = (lastLog?.caseNumber || 0) + 1;

        // Cria o registro no banco
        const modLog = await ModLog.create({
            guildId,
            moderatorId,
            targetId,
            action,
            reason: reason || 'Sem motivo informado',
            duration,
            caseNumber,
        });

        // Verifica se o staff deve ser oculto
        const hideStaff = modConfig.hideStaff || false;
        const moderatorText = hideStaff ? '**Moderação**' : `<@${moderatorId}>`;

        // Envia embed no canal de logs, se configurado
        if (modConfig.logChannel && guild) {
            const logChannel = guild.channels.cache.get(modConfig.logChannel);
            if (logChannel) {
                const actionColors = {
                    ban: PALETTE.error,
                    kick: PALETTE.warning,
                    mute: PALETTE.info,
                    warn: PALETTE.warning,
                    unban: PALETTE.success,
                    unmute: PALETTE.success,
                };

                const embed = new EmbedBuilder()
                    .setColor(actionColors[action] || PALETTE.primary)
                    .setTitle(`📋 Case #${caseNumber} — ${action.toUpperCase()}`)
                    .addFields(
                        { name: '👤 Usuário', value: `<@${targetId}> (\`${targetId}\`)`, inline: true },
                        { name: '🛡️ Moderador', value: moderatorText, inline: true },
                        { name: '📝 Motivo', value: reason || 'Sem motivo informado', inline: false },
                    )
                    .setFooter(tengokuFooter())
                    .setTimestamp();

                if (duration) embed.addFields({ name: '⏱️ Duração', value: duration, inline: true });

                await logChannel.send({ embeds: [embed] }).catch(() => null);
            }
        }

        // Notifica o usuário via DM, se configurado
        if (modConfig.notifyDm && guild) {
            try {
                const targetUser = await guild.client.users.fetch(targetId);
                const dmEmbed = new EmbedBuilder()
                    .setColor(PALETTE.warning)
                    .setTitle(`Você recebeu uma punição em ${guild.name}`)
                    .addFields(
                        { name: 'Ação', value: action.toUpperCase(), inline: true },
                        { name: 'Motivo', value: reason || 'Sem motivo informado', inline: true },
                    )
                    .setFooter(tengokuFooter())
                    .setTimestamp();

                if (duration) dmEmbed.addFields({ name: 'Duração', value: duration, inline: true });

                await targetUser.send({ embeds: [dmEmbed] }).catch(() => null);
            } catch { /* Não foi possível enviar DM */ }
        }

        return modLog;
    } catch (err) {
        logger.error(`❌ Erro ao criar log de moderação: ${err.message}`);
        return null;
    }
}

/**
 * Wrapper de compatibilidade: registerModLog(guildId, targetId, moderatorId, action, reason)
 * Converte a assinatura posicional usada pelos comandos de moderação para o formato createModLog.
 * @returns {Promise<{ caseId: number }|null>}
 */
async function registerModLog(guildId, targetId, moderatorId, action, reason) {
    const result = await createModLog({
        guildId,
        moderatorId,
        targetId,
        action,
        reason,
    });
    // Retorna no formato que os callers esperam ({ caseId })
    return result ? { caseId: result.caseNumber, ...result.toObject() } : null;
}

/**
 * sendModLogChannel — Stub de compatibilidade.
 * createModLog já envia o embed no canal de logs automaticamente,
 * então esta função é mantida apenas para não quebrar os imports existentes.
 */
async function sendModLogChannel() {
    // Já tratado internamente pelo createModLog — nenhuma ação adicional necessária
}

module.exports = { createModLog, registerModLog, sendModLogChannel };
