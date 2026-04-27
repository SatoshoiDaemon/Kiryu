// src/commands/social/highfive.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchWaifuImage } = require('@utils/helpers/embedHelper');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('highfive')
        .setDescription('✋ Dar um toque aqui com alguém.')
        .addUserOption(o => o.setName('usuario').setDescription('Quem vai bater as mãos com você?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        if (target.id === interaction.user.id || target.bot) {
            return interaction.reply({ content: '❌ Você não pode dar um highfive em si mesmo ou num bot.', flags: 64 });
        }

        const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, target.id, interaction.guildId, 2);

        const gifUrl = await fetchWaifuImage('highfive');
        let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2*' : '';

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setDescription(`✋ **${interaction.user.username}** deu um toque em **${target.username}**!${extraMsg}`)
            .setImage(gifUrl)
            .setFooter(olympusFooter())
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:highfive:${interaction.user.id}:${target.id}`)
                .setLabel('Retribuir Highfive')
                .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
    },
};
