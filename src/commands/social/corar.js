// src/commands/social/corar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchWaifuImage } = require('@utils/helpers/embedHelper');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('corar')
        .setDescription('😳 Ficar corado.'),

    async execute(interaction) {
        const gifUrl = await fetchWaifuImage('blush');

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setDescription(`😳 **${interaction.user.username}** ficou corado(a)!`)
            .setImage(gifUrl)
            .setFooter(olympusFooter())
            .setTimestamp();

        // Como é auto-referencial, não tem botão retribuir nem cálculo de casamento
        return interaction.reply({ embeds: [embed] });
    },
};
