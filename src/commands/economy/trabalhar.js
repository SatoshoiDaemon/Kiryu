// src/commands/economy/trabalhar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const UserData = require('@models/UserData');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

const WORK_MESSAGES = [
    'Você trabalhou como programador e ganhou',
    'Você entregou pizzas e ganhou',
    'Você fez freelance de design e ganhou',
    'Você trabalhou como streamer e ganhou',
    'Você vendeu artesanato e ganhou',
    'Você deu aulas particulares e ganhou',
    'Você trabalhou como motorista e ganhou',
    'Você fez traduções e ganhou',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trabalhar')
        .setDescription('💼 Trabalhe para ganhar moedas.'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const userId  = interaction.user.id;
        const config  = await economyManager.getConfig(guildId);

        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de economia está desativado neste servidor.', flags: 64 });
        }

        const userData = await UserData.findOne({ userId, guildId });
        const lastWork = userData?.economy?.lastWork || 0;
        
        const now = Date.now();
        const cooldown = (config.workCooldown || 3600) * 1000;

        if (userData && (now - lastWork) < cooldown) {
            const remaining = cooldown - (now - lastWork);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            const embed = new EmbedBuilder()
                .setColor(PALETTE.warning)
                .setTitle('⏳ Você já trabalhou recentemente')
                .setDescription(`Descanse um pouco! Volte em **${minutes}min ${seconds}s**.`)
                .setFooter(tengokuFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const min = config.workMin || 50;
        const max = config.workMax || 200;
        const earned = Math.floor(Math.random() * (max - min + 1)) + min;
        await economyManager.addBalance(userId, guildId, earned);

        await UserData.findOneAndUpdate(
            { userId, guildId },
            { $set: { 'economy.lastWork': now } },
            { upsert: true, returnDocument: 'after' }
        );

        const message = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('💼 Trabalho Concluído!')
            .setDescription(`${message} **${economyManager.formatCurrency(earned, config, { withName: true })}**!`)
            .setFooter(tengokuFooter(`Próximo trabalho em ${Math.floor(config.workCooldown / 60)} minutos`))
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
