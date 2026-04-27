// src/commands/social/cry.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchWaifuImage } = require('@utils/helpers/embedHelper');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

const MESSAGES = [
    '{user} está chorando... 😢',
    '{user} não conseguiu segurar as lágrimas... 💧',
    '{user} está desabando em lágrimas! 😭',
    '{user} precisa de um abraço... 🥺',
];

async function fetchGif() {
    try {
        const res = await fetch('https://api.waifu.pics/sfw/cry');
        const data = await res.json();
        return data.url;
    } catch { return null; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cry')
        .setDescription('😢 Chore no chat.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('O usuário para quem você está chorando.')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;

        const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, target.id, interaction.guildId, 2);
        let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2*' : '';

        const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
            .replace('{user}', interaction.user.toString())
            .replace('{target}', target.toString()) + extraMsg;

        const gifUrl = await fetchGif();
        const embed = new EmbedBuilder()
            .setColor(PALETTE.info)
            .setDescription(message)
            .setFooter(tengokuFooter())
            .setTimestamp();
        if (gifUrl) embed.setImage(gifUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:hug:${interaction.user.id}:${interaction.user.id}`)
                .setLabel('🤗 Dar um Abraço')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
