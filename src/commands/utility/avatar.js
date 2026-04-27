// src/commands/utility/avatar.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼️ Mostra a foto de perfil de um usuário.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuário alvo (padrão: você)').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const avatarUrl = target.displayAvatarURL({ size: 4096, dynamic: true });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`Avatar de ${target.username}`)
            .setImage(avatarUrl)
            .setFooter(olympusFooter())
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir Imagem')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarUrl)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
