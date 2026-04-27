// src/commands/admin/embed.js
// ============================================================
//   Olympus Community Bot — Criador Visual de Embeds e Webhooks
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embedHandler = require('@handlers/interactions/embedHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('🛠️ Abre o construtor visual de embeds e webhooks.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // O handler cuida da inicialização e do painel
        return embedHandler.startEmbedBuilder(interaction);
    },
};
