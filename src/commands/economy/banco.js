// src/commands/economy/banco.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banco')
        .setDescription('🏦 Deposite ou saque moedas do banco.')
        .addSubcommand(sub => sub.setName('depositar').setDescription('Depositar moedas no banco')
            .addIntegerOption(o => o.setName('valor').setDescription('Valor a depositar (ou "tudo")').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('sacar').setDescription('Sacar moedas do banco')
            .addIntegerOption(o => o.setName('valor').setDescription('Valor a sacar').setRequired(true).setMinValue(1))),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const userId  = interaction.user.id;
        const sub     = interaction.options.getSubcommand();
        const valor   = interaction.options.getInteger('valor');
        const config  = await economyManager.getConfig(guildId);

        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado neste servidor.', flags: 64 });
        }

        const data = await economyManager.getUser(userId, guildId);

        if (sub === 'depositar') {
            if (valor > data.balance) {
                return interaction.reply({ content: `❌ Você não tem ${valor} ${config.currencySymbol} na carteira.`, flags: 64 });
            }
            await economyManager.addBalance(userId, guildId, -valor);
            await economyManager.addBank(userId, guildId, valor);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🏦 Depósito Realizado')
                .setDescription(`Você depositou **${valor} ${config.currencySymbol} ${config.currencyName}** no banco.`)
                .setFooter(olympusFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'sacar') {
            if (valor > data.bank) {
                return interaction.reply({ content: `❌ Você não tem ${valor} ${config.currencySymbol} no banco.`, flags: 64 });
            }
            await economyManager.addBank(userId, guildId, -valor);
            await economyManager.addBalance(userId, guildId, valor);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🏦 Saque Realizado')
                .setDescription(`Você sacou **${valor} ${config.currencySymbol} ${config.currencyName}** do banco.`)
                .setFooter(olympusFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
    },
};
