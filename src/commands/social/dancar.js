// src/commands/social/dancar.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchWaifuImage } = require('@utils/helpers/embedHelper');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dancar')
        .setDescription('💃 Dançar com um usuário.')
        .addUserOption(o => o.setName('usuario').setDescription('Com quem você quer dançar?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        if (target.id === interaction.user.id || target.bot) {
            return interaction.reply({ content: '❌ Você não pode dançar consigo mesmo (ou com um bot) neste comando.', flags: 64 });
        }

        const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, target.id, interaction.guildId, 2);

        const gifUrl = await fetchWaifuImage('dance');
        let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2*' : '';

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setDescription(`💃 **${interaction.user.username}** está dançando com **${target.username}**!${extraMsg}`)
            .setImage(gifUrl)
            .setFooter(tengokuFooter())
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:dance:${interaction.user.id}:${target.id}`)
                .setLabel('Dançar de Volta')
                .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
    },
};
