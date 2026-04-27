// src/commands/economy/coletar.js
// ============================================================
//   Tengoku Community Bot — Coletar Ganhos do Campo Minado
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coletar')
        .setDescription('💰 Colete seus ganhos no campo minado antes de explodir.'),

    async execute(interaction) {
        const minesModule = require('@commands/fun/mines');
        const { games, buildGrid, buildCollectRow } = minesModule;
        const userId = interaction.user.id;
        const game = games.get(userId);

        if (!game) {
            return interaction.reply({ content: '❌ Você não tem uma partida de campo minado ativa.', flags: 64 });
        }

        if (game.revealed.size === 0) {
            return interaction.reply({ content: '❌ Revele pelo menos uma casa antes de coletar!', flags: 64 });
        }

        const config = await economyManager.getConfig(game.guildId);
        const winnings = Math.floor(game.bet * game.multiplier);

        await economyManager.addBalance(userId, game.guildId, winnings);
        games.delete(userId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('💰 Ganhos Coletados!')
            .setDescription(`Multiplicador: **${game.multiplier}x**\nVocê coletou **${economyManager.formatCurrency(winnings, config)}**!`)
            .setFooter(tengokuFooter())
            .setTimestamp();

        const grid = buildGrid(game, true);
        grid.push(buildCollectRow(userId, true));

        return interaction.reply({ embeds: [embed], components: grid });
    },
};
