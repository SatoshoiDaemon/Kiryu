// src/commands/fun/blackjack.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

const SUITS  = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    return SUITS.flatMap(s => VALUES.map(v => ({ suit: s, value: v })));
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function cardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function handValue(hand) {
    let total = hand.reduce((sum, c) => sum + cardValue(c), 0);
    let aces  = hand.filter(c => c.value === 'A').length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function formatHand(hand, hideSecond = false) {
    return hand.map((c, i) => (hideSecond && i === 1) ? '🂠' : `${c.value}${c.suit}`).join(' ');
}

// Armazena partidas em andamento
const games = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('🃏 Jogue blackjack contra o dealer.')
        .addIntegerOption(o => o.setName('aposta').setDescription('Valor da aposta').setRequired(true).setMinValue(1)),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const userId  = interaction.user.id;
        const aposta  = interaction.options.getInteger('aposta');
        const config  = await economyManager.getConfig(guildId);

        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado neste servidor.', flags: 64 });
        }

        const userData = await economyManager.getUser(userId, guildId);
        if (userData.balance < aposta) {
            return interaction.reply({ content: `❌ Você não tem ${aposta} ${config.currencySymbol} na carteira.`, flags: 64 });
        }

        // Desconta a aposta
        await economyManager.addBalance(userId, guildId, -aposta);

        const deck = shuffle(createDeck());
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const game = { deck, playerHand, dealerHand, aposta, guildId, userId };
        games.set(userId, game);

        const playerTotal = handValue(playerHand);
        const dealerShown = cardValue(dealerHand[0]);

        // Blackjack natural
        if (playerTotal === 21) {
            const winnings = Math.floor(aposta * 2.5);
            await economyManager.addBalance(userId, guildId, winnings);
            games.delete(userId);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🃏 Blackjack! 🎉')
                .addFields(
                    { name: 'Sua mão', value: `${formatHand(playerHand)} = **21**`, inline: true },
                    { name: 'Dealer', value: `${formatHand(dealerHand)} = **${handValue(dealerHand)}**`, inline: true },
                    { name: 'Ganho', value: `+${winnings} ${config.currencySymbol}`, inline: false },
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🃏 Blackjack')
            .addFields(
                { name: 'Sua mão', value: `${formatHand(playerHand)} = **${playerTotal}**`, inline: true },
                { name: 'Dealer', value: `${formatHand(dealerHand, true)} = **${dealerShown}+?**`, inline: true },
                { name: 'Aposta', value: `${aposta} ${config.currencySymbol}`, inline: false },
            )
            .setFooter(olympusFooter())
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bj:hit:${userId}`).setLabel('🃏 Pedir').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bj:stand:${userId}`).setLabel('✋ Parar').setStyle(ButtonStyle.Secondary),
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};

// Exporta o mapa de jogos para o handler de interações
module.exports.games = games;
module.exports.handValue = handValue;
module.exports.formatHand = formatHand;
