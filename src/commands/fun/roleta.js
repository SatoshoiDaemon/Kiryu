// src/commands/fun/roleta.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

const COLORS = [
    { name: 'Vermelho', emoji: '🔴', numbers: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] },
    { name: 'Preto',    emoji: '⚫', numbers: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35] },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleta')
        .setDescription('🎰 Aposte na roleta.')
        .addIntegerOption(o => o.setName('aposta').setDescription('Valor da aposta').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('tipo').setDescription('Tipo de aposta').setRequired(true)
            .addChoices(
                { name: '🔴 Vermelho (2x)', value: 'vermelho' },
                { name: '⚫ Preto (2x)',    value: 'preto' },
                { name: '🟢 Zero (35x)',    value: 'zero' },
                { name: '🔢 Par (2x)',      value: 'par' },
                { name: '🔢 Ímpar (2x)',    value: 'impar' },
            )),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const userId  = interaction.user.id;
        const aposta  = interaction.options.getInteger('aposta');
        const tipo    = interaction.options.getString('tipo');
        const config  = await economyManager.getConfig(guildId);

        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado neste servidor.', flags: 64 });
        }

        const userData = await economyManager.getUser(userId, guildId);
        if (userData.balance < aposta) {
            return interaction.reply({ content: `❌ Você não tem ${economyManager.formatCurrency(aposta, config)} na carteira.`, flags: 64 });
        }

        await economyManager.addBalance(userId, guildId, -aposta);

        const number = Math.floor(Math.random() * 37); // 0-36
        const colorInfo = COLORS.find(c => c.numbers.includes(number));
        const colorName = number === 0 ? 'Verde (Zero)' : colorInfo?.name || 'Desconhecido';
        const colorEmoji = number === 0 ? '🟢' : (colorInfo?.emoji || '⚪');

        let won = false;
        let multiplier = 0;

        if (tipo === 'zero' && number === 0)           { won = true; multiplier = 35; }
        else if (tipo === 'vermelho' && colorInfo?.name === 'Vermelho') { won = true; multiplier = 2; }
        else if (tipo === 'preto'    && colorInfo?.name === 'Preto')    { won = true; multiplier = 2; }
        else if (tipo === 'par'   && number !== 0 && number % 2 === 0)  { won = true; multiplier = 2; }
        else if (tipo === 'impar' && number % 2 !== 0)                  { won = true; multiplier = 2; }

        const winnings = won ? aposta * multiplier : 0;
        if (won) await economyManager.addBalance(userId, guildId, winnings);

        const embed = new EmbedBuilder()
            .setColor(won ? PALETTE.success : PALETTE.error)
            .setTitle(`🎰 Roleta — ${colorEmoji} **${number}** (${colorName})`)
            .setDescription(won
                ? `🎉 Você ganhou! **+${economyManager.formatCurrency(winnings, config)}** (${multiplier}x)`
                : `😔 Você perdeu **${economyManager.formatCurrency(aposta, config)}**.`)
            .addFields(
                { name: 'Número sorteado', value: `${colorEmoji} **${number}**`, inline: true },
                { name: 'Sua aposta', value: `${tipo} — ${economyManager.formatCurrency(aposta, config)}`, inline: true },
            )
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
