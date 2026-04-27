// src/commands/social/perfil.js
// ============================================================
//   Tengoku Community Bot — Perfil Social Customizável
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const UserData = require('@models/UserData');
const Guild = require('@models/Guild');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('👤 Veja ou edite seu perfil social.')
        .addSubcommand(sub => sub.setName('ver').setDescription('👀 Veja um perfil')
            .addUserOption(o => o.setName('usuario').setDescription('Usuário para ver').setRequired(false)))
        .addSubcommand(sub => sub.setName('editar').setDescription('✏️ Edite seu perfil')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (sub === 'ver') {
            const target = interaction.options.getUser('usuario') || interaction.user;
            let userDoc = await UserData.findOne({ userId: target.id, guildId });
            if (!userDoc) userDoc = await UserData.create({ userId: target.id, guildId });

            const branding = await brandingManager.get(guildId);
            const profile = userDoc.profile || {};
            const stats = userDoc.stats || {};
            const xp = userDoc.xp || {};
            const economy = userDoc.economy || {};

            const embed = new EmbedBuilder()
                .setColor(branding.accent || PALETTE.accent)
                .setAuthor({ name: `@${target.username}`, iconURL: target.displayAvatarURL() })
                .setTitle('👤 Perfil Social')
                .setDescription(profile.bio || 'No bio yet.')
                .addFields(
                    { name: '⭐ XP', value: `Lvl **${xp.level || 0}** (${xp.current || 0} XP)`, inline: true },
                    { name: '💰 Saldo', value: `${(economy.balance || 0).toLocaleString('pt-BR')}`, inline: true },
                    { name: '🏦 Banco', value: `${(economy.bank || 0).toLocaleString('pt-BR')}`, inline: true },
                    { name: '💬 Mensagens', value: `${(stats.messages || 0).toLocaleString('pt-BR')}`, inline: true },
                    { name: '🎙️ Tempo em Call', value: `${Math.floor((stats.voiceMinutes || 0) / 60)}h ${(stats.voiceMinutes || 0) % 60}m`, inline: true },
                    { name: '📨 Invites', value: `${stats.invites || 0}`, inline: true },
                )
                .setThumbnail(profile.thumbnail || target.displayAvatarURL())
                .setFooter(tengokuFooter())
                .setTimestamp();

            if (profile.image) embed.setImage(profile.image);

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'editar') {
            const guildDoc = await Guild.findOne({ guildId });
            const profileCfg = guildDoc?.profileConfig || {};
            const member = await interaction.guild.members.fetch(interaction.user.id);

            // Verifica se o membro tem cargo com bio expandida
            let maxBio = profileCfg.maxBioLength || 150;
            const extRoles = profileCfg.extendedBioRoles || [];
            if (extRoles.some(r => member.roles.cache.has(r))) {
                maxBio = profileCfg.extendedBioLength || 500;
            }

            const modal = new ModalBuilder()
                .setCustomId('modal:perfil:edit')
                .setTitle('✏️ Editar Perfil');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('perfil_bio')
                        .setLabel(`Bio (máx ${maxBio} caracteres)`)
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                        .setMaxLength(maxBio)
                        .setPlaceholder('Escreva algo sobre você...')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('perfil_thumbnail')
                        .setLabel('URL da Thumbnail (avatar)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setPlaceholder('https://i.imgur.com/...')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('perfil_image')
                        .setLabel('URL da Imagem de Fundo')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setPlaceholder('https://i.imgur.com/...')
                ),
            );

            return interaction.showModal(modal);
        }
    },
};
