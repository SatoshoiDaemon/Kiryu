// src/commands/social/divorciar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Marriage = require('@models/Marriage');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('divorciar')
        .setDescription('💔 Divorcie-se do seu parceiro.'),

    async execute(interaction) {
        const guildId = interaction.guildId;

        const marriage = await Marriage.findOneAndDelete({
            guildId,
            $or: [{ user1Id: interaction.user.id }, { user2Id: interaction.user.id }]
        });

        if (!marriage) {
            return interaction.reply({ content: '❌ Você não está casado!', flags: 64 });
        }

        const partnerId = marriage.user1Id === interaction.user.id ? marriage.user2Id : marriage.user1Id;
        const partner = await interaction.client.users.fetch(partnerId).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.error)
            .setTitle('💔 Divórcio')
            .setDescription(`${interaction.user} se divorciou de ${partner ? partner.toString() : `<@${partnerId}>`}.`)
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
