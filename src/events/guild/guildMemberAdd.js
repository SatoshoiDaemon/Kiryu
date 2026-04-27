// src/events/guild/guildMemberAdd.js
const { EmbedBuilder } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');
const logger = require('@utils/logger');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const guildId = member.guild.id;
        const guildDoc = await Guild.findOne({ guildId });

        // ── Boas-vindas ──────────────────────────────────────────
        const welcome = guildDoc?.welcomeConfig;

        if (welcome?.enabled) {
            const branding = await brandingManager.get(guildId);
            const memberCount = member.guild.memberCount;

            // Mensagem no canal
            if (welcome.welcomeChannel) {
                const channel = member.guild.channels.cache.get(welcome.welcomeChannel);
                if (channel) {
                    const message = (welcome.welcomeMsgChannel || 'Bem-vindo(a) ao servidor, {user}! Você é o membro #{count}.')
                        .replace(/{user}/g, member.toString())
                        .replace(/{username}/g, member.user.username)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, memberCount.toLocaleString('pt-BR'));

                    const embed = new EmbedBuilder()
                        .setColor(branding.accent || PALETTE.primary)
                        .setTitle(`Bem-vindo(a) ao ${member.guild.name}!`)
                        .setDescription(message)
                        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
                        .setFooter(olympusFooter(`Membro #${memberCount.toLocaleString('pt-BR')}`))
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(err =>
                        logger.warn(`Falha ao enviar boas-vindas em ${guildId}: ${err.message}`)
                    );
                }
            }

            // DM automática
            if (welcome.dmEnabled && welcome.welcomeMsgDm) {
                const dmMessage = welcome.welcomeMsgDm
                    .replace(/{user}/g, member.toString())
                    .replace(/{username}/g, member.user.username)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{count}/g, memberCount.toLocaleString('pt-BR'));

                await member.send({ content: dmMessage }).catch(() => null);
            }
        }

        // ── Cargos automáticos ───────────────────────────────────
        if (welcome?.initialRoles && welcome.initialRoles.length > 0) {
            for (const roleId of welcome.initialRoles) {
                const role = member.guild.roles.cache.get(roleId);
                if (role) {
                    await member.roles.add(role).catch(err =>
                        logger.warn(`Falha ao adicionar auto-role ${roleId} em ${guildId}: ${err.message}`)
                    );
                }
            }
        }
    },
};

