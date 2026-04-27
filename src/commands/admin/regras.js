// src/commands/admin/regras.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const rulesHandler = require('@handlers/interactions/rulesHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('regras')
        .setDescription('⚙️ Gerencia as automações e regras agendadas do servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '❌ Este comando só pode ser usado em servidores.', flags: 64 });
        }

        // Defer o reply porque consultar DB pode demorar (embora seja rápido)
        await interaction.deferReply({ flags: 64 });

        // Envia o dashboard principal
        await rulesHandler.showDashboard(interaction, false);
    },
};
