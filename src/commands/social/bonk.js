// src/commands/social/bonk.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchWaifuImage, PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

const MESSAGES = [
    '{user} deu um bonk em {target}! 🔨',
    '{user} acertou {target} com o martelo da vergonha! 💥',
    '{user} mandou {target} pro horny jail! 🏛️',
    'BONK! {user} acertou em cheio {target}! 🔨💫',
];

async function fetchGif() {
    try {
        const res = await fetch('https://api.waifu.pics/sfw/bonk');
        const data = await res.json();
        return data.url;
    } catch { return null; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bonk')
        .setDescription('🔨 Dê um bonk em alguém.')
        .addUserOption(o => o.setName('usuario').setDescription('Quem você quer bonkar?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Você não pode se bonkar!', flags: 64 });
        }

        const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, target.id, interaction.guildId, 2);
        let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2*' : '';

        const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
            .replace('{user}', interaction.user.toString())
            .replace('{target}', target.toString()) + extraMsg;

        const gifUrl = await fetchGif();
        const embed = new EmbedBuilder()
            .setColor(PALETTE.warning)
            .setDescription(message)
            .setFooter(olympusFooter())
            .setTimestamp();
        if (gifUrl) embed.setImage(gifUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:bonk:${target.id}:${interaction.user.id}`)
                .setLabel('🔨 Retribuir Bonk')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
