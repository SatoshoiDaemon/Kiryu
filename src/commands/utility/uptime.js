// src/commands/utility/uptime.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('atividade')
        .setDescription('⏱️ Mostra há quanto tempo o bot está online.'),

    async execute(interaction) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime) % 60;

        let uptimeString = '';
        if (days > 0) uptimeString += `${days}d `;
        if (hours > 0) uptimeString += `${hours}h `;
        if (minutes > 0) uptimeString += `${minutes}m `;
        uptimeString += `${seconds}s`;

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle('⏱️ Uptime do Bot')
            .setDescription(`Estou online e operando sem interrupções há:\n**${uptimeString}**`)
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
