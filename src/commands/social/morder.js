// src/commands/social/morder.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchWaifuImage } = require('@utils/helpers/embedHelper');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('morder')
        .setDescription('🧛 Morder um usuário.')
        .addUserOption(o => o.setName('usuario').setDescription('Quem você quer morder?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        if (target.id === interaction.user.id || target.bot) {
            return interaction.reply({ content: '❌ Você não pode morder a si mesmo ou a um bot.', flags: 64 });
        }

        // Afinidade se casados
        const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, target.id, interaction.guildId, 2);

        const gifUrl = await fetchWaifuImage('bite');
        
        // Formata menção passiva pra afk parser caso eles estejam afk
        let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2*' : '';

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setDescription(`🧛 **${interaction.user.username}** mordeu **${target.username}**!${extraMsg}`)
            .setImage(gifUrl)
            .setFooter(olympusFooter())
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:bite:${interaction.user.id}:${target.id}`)
                .setLabel('Retribuir Mordaça')
                .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
    },
};
