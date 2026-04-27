// src/commands/utility/ping.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Verifica a latência do bot.'),

    async execute(interaction) {
        const response = await interaction.reply({ content: 'Calculando...', withResponse: true });
        const sent = response.resource.message;
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const getStatus = (ms) => {
            if (ms < 100) return '🟢 Excelente';
            if (ms < 200) return '🟡 Bom';
            if (ms < 400) return '🟠 Regular';
            return '🔴 Alto';
        };

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Latência do Bot', value: `**${latency}ms** ${getStatus(latency)}`, inline: true },
                { name: 'Latência da API', value: `**${apiLatency}ms** ${getStatus(apiLatency)}`, inline: true },
            )
            .setFooter(olympusFooter())
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
