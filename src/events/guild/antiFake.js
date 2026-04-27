// src/events/guild/antiFake.js
// ============================================================
//   Tengoku Community Bot — Anti-Fake (guildMemberAdd)
// ============================================================

const { EmbedBuilder } = require('discord.js');
const Guild = require('@models/Guild');
const { registerModLog } = require('@utils/helpers/modHelper');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const logger = require('@utils/logger');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        try {
            const guildId = member.guild.id;
            const guildDoc = await Guild.findOne({ guildId });
            const cfg = guildDoc?.antiFakeConfig;
            if (!cfg?.enabled) return;

            let triggered = false;
            let reason = '';

            // 1. Verificar idade da conta
            if (cfg.minAccountAge > 0) {
                const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
                if (accountAge < cfg.minAccountAge) {
                    triggered = true;
                    reason = `Conta muito nova (${Math.floor(accountAge)} dias). Mínimo: ${cfg.minAccountAge} dias.`;
                }
            }

            // 2. Verificar se é bot
            if (!triggered && cfg.kickBots && member.user.bot) {
                const isVerified = member.user.flags?.has('VerifiedBot');
                if (cfg.kickUnverifiedBots && !isVerified) {
                    triggered = true;
                    reason = 'Bot não verificado adicionado ao servidor.';
                } else if (!cfg.kickUnverifiedBots) {
                    triggered = true;
                    reason = 'Bot adicionado ao servidor (todos os bots bloqueados).';
                }
            }

            // 3. Verificar nicks banidos
            if (!triggered && cfg.bannedNicknames?.length > 0) {
                const username = member.user.username.toLowerCase();
                const displayName = (member.displayName || '').toLowerCase();
                const banned = cfg.bannedNicknames.map(n => n.toLowerCase());
                if (banned.some(b => username.includes(b) || displayName.includes(b))) {
                    triggered = true;
                    reason = `Nickname contém palavra banida (${member.user.username}).`;
                }
            }

            // 4. Verificar Avatar
            if (!triggered && cfg.blockNoAvatar) {
                if (!member.user.avatar) {
                    triggered = true;
                    reason = 'Conta sem foto de perfil (bloqueado por Anti-Fake).';
                }
            }

            // 5. Verificar Links de Convite
            if (!triggered && cfg.blockInviteLinks) {
                const inviteRegex = /(discord\.(gg|com\/invite)\/[a-zA-Z0-9]+)/i;
                const username = member.user.username;
                const displayName = member.displayName || '';
                if (inviteRegex.test(username) || inviteRegex.test(displayName)) {
                    triggered = true;
                    reason = 'Link de convite detectado no nome de usuário/apelido.';
                }
            }

            if (!triggered) return;

            const action = cfg.action || 'kick';

            // Aplicar ação
            try {
                if (action === 'ban') {
                    await member.ban({ reason: `[Anti-Fake] ${reason}`, deleteMessageSeconds: 86400 });
                } else if (action === 'timeout') {
                    await member.timeout(600000, `[Anti-Fake] ${reason}`);
                } else if (action === 'kick') {
                    await member.kick(`[Anti-Fake] ${reason}`);
                }
                // 'log' doesn't execute anything on the member, it just falls through to the ModLog below
            } catch (err) {
                logger.warn(`[Anti-Fake] Não foi possível aplicar ${action} em ${member.user.tag}: ${err.message}`);
                return;
            }

            // Registrar no ModLog
            await registerModLog(guildId, member.user.id, client.user.id, `anti-fake-${action}`, reason);

            // Log no canal de moderação
            const modCfg = guildDoc?.modConfig;
            if (modCfg?.logChannel) {
                const logChannel = member.guild.channels.cache.get(modCfg.logChannel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(PALETTE.error)
                        .setTitle('🛡️ Anti-Fake — Ação Automática')
                        .setDescription(`**Ação:** ${action.toUpperCase()}\n**Motivo:** ${reason}`)
                        .addFields(
                            { name: 'Usuário', value: `${member.user.tag} (\`${member.user.id}\`)`, inline: true },
                            { name: 'Conta criada em', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setFooter(tengokuFooter())
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] }).catch(() => null);
                }
            }
        } catch (err) {
            logger.error(`[Anti-Fake] Erro: ${err.message}`);
        }
    },
};
