// src/commands/utility/parceria.js
// ============================================================
//   Olympus Community Bot — Comando /parceria
//   Envia candidatura de parceria para análise da equipe
// ============================================================

const {
    SlashCommandBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const Guild = require('@models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('parceria')
        .setDescription('🤝 Envie uma candidatura de parceria para o servidor.'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const guildDoc = await Guild.findOne({ guildId });
        const config = guildDoc?.partnershipsConfig;

        if (!config?.enabled || !config.analysisChannel) {
            return interaction.reply({ content: '❌ O sistema de parcerias não está configurado neste servidor.', flags: 64 });
        }

        const modal = new ModalBuilder()
            .setCustomId('modal:partnership:submit')
            .setTitle('🤝 Candidatura de Parceria');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('partner_server_name')
                    .setLabel('Nome do seu servidor')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100)
                    .setPlaceholder('Ex: Meu Servidor Incrível')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('partner_invite_link')
                    .setLabel('Link de convite permanente')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('https://discord.gg/...')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('partner_member_count')
                    .setLabel('Quantidade de membros')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Ex: 500')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('partner_description')
                    .setLabel('Descrição e motivo da parceria')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMinLength(20)
                    .setMaxLength(1000)
                    .setPlaceholder('Descreva seu servidor e por que deseja fazer parceria...')
            ),
        );

        await interaction.showModal(modal);
    },
};
