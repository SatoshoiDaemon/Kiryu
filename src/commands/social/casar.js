// src/commands/social/casar.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Marriage = require('@models/Marriage');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('casar')
        .setDescription('💍 Peça alguém em casamento.')
        .addUserOption(o => o.setName('usuario').setDescription('Com quem você quer se casar?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const guildId = interaction.guildId;

        if (target.id === interaction.user.id || target.bot) {
            return interaction.reply({ content: '❌ Você não pode se casar consigo mesmo ou com um bot!', flags: 64 });
        }

        // Verifica se já está casado
        const existingMarriage = await Marriage.findOne({
            guildId,
            $or: [{ user1Id: interaction.user.id }, { user2Id: interaction.user.id }]
        });

        if (existingMarriage) {
            return interaction.reply({ content: '❌ Você já está casado! Use `/divorciar` primeiro.', flags: 64 });
        }

        const targetMarriage = await Marriage.findOne({
            guildId,
            $or: [{ user1Id: target.id }, { user2Id: target.id }]
        });

        if (targetMarriage) {
            return interaction.reply({ content: `❌ ${target.username} já está casado!`, flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle('💍 Pedido de Casamento!')
            .setDescription(`${interaction.user} está pedindo ${target} em casamento!\n\n${target}, você aceita?`)
            .setFooter(tengokuFooter('O pedido expira em 60 segundos'))
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`marry:accept:${interaction.user.id}:${target.id}`).setLabel('💍 Aceitar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`marry:decline:${interaction.user.id}:${target.id}`).setLabel('❌ Recusar').setStyle(ButtonStyle.Danger),
        );

        const reply = await interaction.reply({ embeds: [embed], components: [row] });

        // Expira após 60 segundos
        setTimeout(async () => {
            try {
                await interaction.editReply({ components: [] });
            } catch { /* ignore */ }
        }, 60000);
    },
};
