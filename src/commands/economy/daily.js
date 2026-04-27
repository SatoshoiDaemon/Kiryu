// src/commands/economy/daily.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('💰 Colete sua recompensa diária.'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const userId  = interaction.user.id;
        const config  = await economyManager.getConfig(guildId);

        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado neste servidor.', flags: 64 });
        }

        const { canClaim, remaining, streak } = await economyManager.checkDaily(userId, guildId);

        if (!canClaim) {
            const hours   = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const embed = new EmbedBuilder()
                .setColor(PALETTE.warning)
                .setTitle('⏳ Daily já coletado')
                .setDescription(`Você já coletou seu daily hoje! Volte em **${hours}h ${minutes}min**.`)
                .setFooter(olympusFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const newStreak = streak + 1;
        const bonus = Math.floor(config.dailyAmount * (newStreak > 1 ? Math.min(newStreak * 0.05, 0.5) : 0));
        const total = config.dailyAmount + bonus;

        await economyManager.claimDaily(userId, guildId, streak);
        await economyManager.addBalance(userId, guildId, total);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('💰 Daily Coletado!')
            .setDescription(`Você recebeu **${total} ${config.currencySymbol} ${config.currencyName}**!`)
            .addFields(
                { name: 'Base', value: `${config.dailyAmount} ${config.currencySymbol}`, inline: true },
                { name: 'Bônus de Streak', value: bonus > 0 ? `+${bonus} ${config.currencySymbol}` : 'Nenhum', inline: true },
                { name: 'Streak Atual', value: `🔥 ${newStreak} dia(s)`, inline: true },
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
