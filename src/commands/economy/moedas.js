// src/commands/economy/moedas.js — Gerenciamento admin de moedas
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const permissionsManager = require('@utils/managers/permissionsManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moedas')
        .setDescription('🪙 Gerenciamento de moedas (Admin).')
        .addSubcommand(sub => sub.setName('adicionar').setDescription('Adicionar moedas a um usuário')
            .addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true))
            .addIntegerOption(o => o.setName('valor').setDescription('Valor').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('remover').setDescription('Remover moedas de um usuário')
            .addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true))
            .addIntegerOption(o => o.setName('valor').setDescription('Valor').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('definir').setDescription('Definir o saldo de um usuário')
            .addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true))
            .addIntegerOption(o => o.setName('valor').setDescription('Novo saldo').setRequired(true).setMinValue(0)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'moedas', PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: '❌ Você não tem permissão para gerenciar moedas.', flags: 64 });
        }

        const sub    = interaction.options.getSubcommand();
        const target = interaction.options.getUser('usuario');
        const valor  = interaction.options.getInteger('valor');
        const config = await economyManager.getConfig(interaction.guildId);

        if (sub === 'adicionar') {
            await economyManager.addBalance(target.id, interaction.guildId, valor);
            return interaction.reply({ embeds: [
                new EmbedBuilder().setColor(PALETTE.success)
                    .setTitle('✅ Moedas Adicionadas')
                    .setDescription(`**+${valor} ${config.currencySymbol}** adicionado(s) à carteira de ${target}.`)
                    .setFooter(olympusFooter()).setTimestamp()
            ], flags: 64 });
        }

        if (sub === 'remover') {
            await economyManager.addBalance(target.id, interaction.guildId, -valor);
            return interaction.reply({ embeds: [
                new EmbedBuilder().setColor(PALETTE.warning)
                    .setTitle('✅ Moedas Removidas')
                    .setDescription(`**-${valor} ${config.currencySymbol}** removido(s) da carteira de ${target}.`)
                    .setFooter(olympusFooter()).setTimestamp()
            ], flags: 64 });
        }

        if (sub === 'definir') {
            await economyManager.setBalance(target.id, interaction.guildId, valor);
            return interaction.reply({ embeds: [
                new EmbedBuilder().setColor(PALETTE.info)
                    .setTitle('✅ Saldo Definido')
                    .setDescription(`Saldo de ${target} definido para **${valor} ${config.currencySymbol}**.`)
                    .setFooter(olympusFooter()).setTimestamp()
            ], flags: 64 });
        }
    },
};
