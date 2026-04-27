// src/commands/economy/carteira.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

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
                { name: `${config.currencySymbol} Carteira`, value: `**${data.balance.toLocaleString('pt-BR')}** ${config.currencyName}`, inline: true },
                { name: '🏦 Banco', value: `**${data.bank.toLocaleString('pt-BR')}** ${config.currencyName}`, inline: true },
                { name: '💰 Total', value: `**${total.toLocaleString('pt-BR')}** ${config.currencyName}`, inline: true },
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
