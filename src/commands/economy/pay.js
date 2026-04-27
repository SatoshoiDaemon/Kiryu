// src/commands/economy/pay.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('💸 Transfira moedas da sua carteira para outro usuário.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário que receberá as moedas')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('quantidade')
                .setDescription('A quantidade de moedas a transferir')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const sender = interaction.user;
        const receiver = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('quantidade');

        if (sender.id === receiver.id) {
            return interaction.reply({ content: '❌ Você não pode transferir dinheiro para você mesmo.', flags: 64 });
        }
        if (receiver.bot) {
            return interaction.reply({ content: '❌ Bots não usam dinheiro.', flags: 64 });
        }

        const config = await economyManager.getConfig(guildId);
        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado.', flags: 64 });
        }

        const senderData = await economyManager.getUser(sender.id, guildId);

        if (senderData.balance < amount) {
            return interaction.reply({ content: `❌ Você não tem moedas suficientes na carteira. Saldo atual: **${senderData.balance} ${config.currencySymbol}**`, flags: 64 });
        }

        await economyManager.addBalance(sender.id, guildId, -amount);
        await economyManager.addBalance(receiver.id, guildId, amount);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('💸 Transferência Concluída!')
            .setDescription(`Você enviou **${amount} ${config.currencySymbol}** para ${receiver}!`)
            .setFooter(olympusFooter())
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
};
