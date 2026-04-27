// src/commands/utility/sugestao.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sugestao')
        .setDescription('💡 Envie uma sugestão para o servidor.'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const guildDoc = await Guild.findOne({ guildId });
        const config = guildDoc?.suggestionsConfig;

        if (!config?.enabled || !config.channelId) {
            return interaction.reply({ content: '❌ O sistema de sugestões não está configurado neste servidor.', flags: 64 });
        }

        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (!channel) {
            return interaction.reply({ content: '❌ O canal de sugestões não foi encontrado.', flags: 64 });
        }

        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
        const modal = new ModalBuilder()
            .setCustomId('modal:suggestion:submit')
            .setTitle('💡 Enviar Sugestão');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('suggestion_content')
                    .setLabel('Sua sugestão')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(1000)
                    .setPlaceholder('Descreva sua sugestão em detalhes...')
            )
        );

        await interaction.showModal(modal);
    },
};
