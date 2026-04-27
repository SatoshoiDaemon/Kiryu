// src/commands/social/pat.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchWaifuImage, PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

const MESSAGES = [
    '{user} fez carinho em {target}! 🥰',
    '{user} deu um tapinha na cabeça de {target}! ✨',
    '{user} acariciou {target} com carinho! 💜',
    '{user} passou a mão na cabeça de {target}!',
];

async function fetchGif() {
    try {
        const res = await fetch('https://api.waifu.pics/sfw/pat');
        const data = await res.json();
        return data.url;
    } catch { return null; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('🥰 Faça carinho em alguém.')
        .addUserOption(o => o.setName('usuario').setDescription('Quem você quer acariciar?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Você não pode se acariciar!', flags: 64 });
        }

        const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, target.id, interaction.guildId, 2);
        let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2*' : '';

        const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
            .replace('{user}', interaction.user.toString())
            .replace('{target}', target.toString()) + extraMsg;

        const gifUrl = await fetchGif();
        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setDescription(message)
            .setFooter(olympusFooter())
            .setTimestamp();
        if (gifUrl) embed.setImage(gifUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:pat:${target.id}:${interaction.user.id}`)
                .setLabel('🥰 Retribuir Carinho')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
