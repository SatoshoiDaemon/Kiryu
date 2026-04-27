// src/commands/utility/banner.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('🖼️ Mostra o banner do perfil de um usuário.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuário alvo (padrão: você)').setRequired(false)),

    async execute(interaction) {
        let target = interaction.options.getUser('usuario') || interaction.user;
        
        // Fetch para pegar o banner (o getUser normal não traz cache do banner às vezes)
        target = await target.fetch();

        const bannerUrl = target.bannerURL({ size: 4096, dynamic: true });

        if (!bannerUrl) {
            const hexColor = target.hexAccentColor || '#000000';
            const embed = new EmbedBuilder()
                .setColor(PALETTE.accent)
                .setTitle(`Banner de ${target.username}`)
                .setDescription(`Este usuário não possui uma imagem de banner.\nCor de destaque: **${hexColor}**`)
                .setFooter(olympusFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`Banner de ${target.username}`)
            .setImage(bannerUrl)
            .setFooter(olympusFooter())
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir Imagem')
                .setStyle(ButtonStyle.Link)
                .setURL(bannerUrl)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
