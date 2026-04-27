// src/commands/economy/coinflip.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cara-coroa')
        .setDescription('💰 Jogue cara ou coroa apostando moedas.')
        .addStringOption(option => 
            option.setName('escolha')
                .setDescription('Sua aposta')
                .setRequired(true)
                .addChoices(
                    { name: 'Cara', value: 'cara' },
                    { name: 'Coroa', value: 'coroa' }
                )
        )
        .addIntegerOption(option => 
            option.setName('valor')
                .setDescription('Valor da aposta')
                .setRequired(true)
                .setMinValue(10)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const user = interaction.user;
        const choice = interaction.options.getString('escolha');
        const amount = interaction.options.getInteger('valor');

        const config = await economyManager.getConfig(guildId);
        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado.', flags: 64 });
        }

        const userData = await economyManager.getUser(user.id, guildId);

        if (userData.balance < amount) {
            return interaction.reply({ content: `❌ Você não tem moedas suficientes na carteira. Saldo atual: **${economyManager.formatCurrency(userData.balance, config)}**`, flags: 64 });
        }

        // Gira a moeda
        const result = Math.random() < 0.5 ? 'cara' : 'coroa';
        const win = result === choice;

        if (win) {
            await economyManager.addBalance(user.id, guildId, amount); // ganha +amout
            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🪙 Cara ou Coroa')
                .setDescription(`A moeda caiu em **${result.toUpperCase()}**!\n\nVocê ganhou **${economyManager.formatCurrency(amount, config)}**! 🎉`)
                .setFooter(tengokuFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } else {
            await economyManager.addBalance(user.id, guildId, -amount); // perde
            const embed = new EmbedBuilder()
                .setColor(PALETTE.error)
                .setTitle('🪙 Cara ou Coroa')
                .setDescription(`A moeda caiu em **${result.toUpperCase()}**.\n\nVocê perdeu **${economyManager.formatCurrency(amount, config)}**. 😔`)
                .setFooter(tengokuFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
    }
};
