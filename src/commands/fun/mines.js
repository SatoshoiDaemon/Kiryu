// src/commands/economy/mines.js
// ============================================================
//   Olympus Community Bot — Minigame Mines (Campo Minado)
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

const games = new Map();

const GRID_ROWS = 4;
const GRID_COLS = 5;
const BOMB_COUNT = 5;

function createGame(userId, guildId, bet) {
    const bombs = new Set();
    while (bombs.size < BOMB_COUNT) {
        bombs.add(Math.floor(Math.random() * GRID_ROWS * GRID_COLS));
    }
    return {
        userId, guildId, bet,
        bombs,
        revealed: new Set(),
        collected: false,
        multiplier: 1.0,
    };
}

function getMultiplier(revealed, totalSafe) {
    // Cada casa revelada aumenta o multiplicador exponencialmente
    if (revealed === 0) return 1.0;
    const base = (GRID_ROWS * GRID_COLS) / (GRID_ROWS * GRID_COLS - BOMB_COUNT);
    return parseFloat(Math.pow(base, revealed).toFixed(2));
}

function buildGrid(game, gameOver = false) {
    const rows = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        const actionRow = new ActionRowBuilder();
        for (let c = 0; c < GRID_COLS; c++) {
            const idx = r * GRID_COLS + c;
            const isBomb = game.bombs.has(idx);
            const isRevealed = game.revealed.has(idx);

            let style = ButtonStyle.Secondary;
            let label = '⬜';
            let disabled = false;

            if (gameOver) {
                disabled = true;
                if (isBomb) { label = '💣'; style = ButtonStyle.Danger; }
                else if (isRevealed) { label = '💎'; style = ButtonStyle.Success; }
            } else if (isRevealed) {
                label = '💎'; style = ButtonStyle.Success; disabled = true;
            }

            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mines:${idx}:${game.userId}`)
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(disabled || game.collected)
            );
        }
        rows.push(actionRow);
    }
    return rows;
}

function buildCollectRow(userId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mines:collect:${userId}`)
            .setLabel('💰 Coletar Ganhos')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mines')
        .setDescription('💣 Jogue Campo Minado! Revele casas e colete antes de explodir.')
        .addIntegerOption(o => o.setName('aposta').setDescription('Valor da aposta').setRequired(true).setMinValue(10)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const bet = interaction.options.getInteger('aposta');

        const config = await economyManager.getConfig(guildId);
        if (!config.enabled) return interaction.reply({ content: '❌ Economia desativada.', flags: 64 });

        if (games.has(userId)) return interaction.reply({ content: '❌ Você já tem uma partida de Mines ativa! Colete ou finalize.', flags: 64 });

        const userData = await economyManager.getUser(userId, guildId);
        if (userData.balance < bet) return interaction.reply({ content: `❌ Saldo insuficiente. Você tem **${userData.balance} ${config.currencySymbol}**.`, flags: 64 });

        await economyManager.addBalance(userId, guildId, -bet);

        const game = createGame(userId, guildId, bet);
        games.set(userId, game);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('💣 Mines — Campo Minado')
            .setDescription(`Aposta: **${bet} ${config.currencySymbol}**\nMultiplicador: **${game.multiplier}x**\nGanho atual: **${Math.floor(bet * game.multiplier)} ${config.currencySymbol}**\n\nClique nas casas para revelar! 💎 = seguro, 💣 = boom!`)
            .setFooter(olympusFooter())
            .setTimestamp();

        const grid = buildGrid(game);
        grid.push(buildCollectRow(userId, true)); // Desabilitado: precisa revelar pelo menos 1 casa

        return interaction.reply({ embeds: [embed], components: grid });
    },

    // Export for button handler
    games, getMultiplier, buildGrid, buildCollectRow, BOMB_COUNT, GRID_ROWS, GRID_COLS,
};
