// src/commands/utility/lembrete.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Reminder = require('@models/Reminder');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lembrete')
        .setDescription('⏰ Crie um lembrete para ser notificado depois.')
        .addStringOption(o => o.setName('tempo').setDescription('Tempo (ex: 10m, 1h, 2d)').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('O que eu devo te lembrar?').setRequired(true)),

    async execute(interaction) {
        const timeInput = interaction.options.getString('tempo');
        const reason = interaction.options.getString('motivo');

        const msTime = ms(timeInput);
        if (!msTime || msTime < 1000 || msTime > ms('30d')) {
            return interaction.reply({ content: '❌ Tempo inválido! Use formatos como `10m` (minutos), `1h` (horas), `2d` (dias). Máx 30 dias.', flags: 64 });
        }

        const expiresAt = new Date(Date.now() + msTime);

        const newReminder = new Reminder({
            userId: interaction.user.id,
            channelId: interaction.channelId,
            reason,
            expiresAt
        });

        await newReminder.save();

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('⏰ Lembrete Criado!')
            .setDescription(`Vou te lembrar sobre **"${reason}"** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>.`)
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
