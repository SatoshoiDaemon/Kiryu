// src/commands/economy/carteira.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('carteira')
        .setDescription('💳 Veja o saldo de sua carteira.')
        .addUserOption(o => o.setName('usuario').setDescription('Ver carteira de outro usuário').setRequired(false)),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const target  = interaction.options.getUser('usuario') || interaction.user;
        const config  = await economyManager.getConfig(guildId);

        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado neste servidor.', flags: 64 });
        }

        const data = await economyManager.getUser(target.id, guildId);
        const total = data.balance + data.bank;

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle(`💳 Carteira de ${target.username}`)
            .addFields(
                { name: `${config.currencySymbol} Carteira`, value: `**${economyManager.formatCurrency(data.balance, config, { withName: true })}**`, inline: true },
                { name: '🏦 Banco', value: `**${economyManager.formatCurrency(data.bank, config, { withName: true })}**`, inline: true },
                { name: '💰 Total', value: `**${economyManager.formatCurrency(total, config, { withName: true })}**`, inline: true },
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
