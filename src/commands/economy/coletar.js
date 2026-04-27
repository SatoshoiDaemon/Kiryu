// src/commands/economy/coletar.js
// ============================================================
//   Olympus Community Bot — Coletar Ganhos do Mines
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coletar')
        .setDescription('💰 Colete seus ganhos no Mines antes de explodir!'),

    async execute(interaction) {
        const minesModule = require('@commands/fun/mines');
        const { games, buildGrid, buildCollectRow } = minesModule;
        const userId = interaction.user.id;
        const game = games.get(userId);

        if (!game) {
            return interaction.reply({ content: '❌ Você não tem uma partida de Mines ativa.', flags: 64 });
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
            .setDescription(`Multiplicador: **${game.multiplier}x**\nVocê coletou **${winnings} ${config.currencySymbol}**!`)
            .setFooter(olympusFooter())
            .setTimestamp();

        const grid = buildGrid(game, true);
        grid.push(buildCollectRow(userId, true));

        return interaction.reply({ embeds: [embed], components: grid });
    },
};
