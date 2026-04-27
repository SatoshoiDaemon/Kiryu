// src/commands/admin/respostas.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const autoResponseHandler = require('@handlers/interactions/autoResponseHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('respostas')
        .setDescription('⚙️ Gerencie gatilhos e auto-respostas dinâmicas no servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ Este comando só pode ser usado em servidores.', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });
        await autoResponseHandler.showDashboard(interaction, false);
    },
};
