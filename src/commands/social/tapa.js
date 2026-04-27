// src/commands/social/tapa.js
// ============================================================
//   Olympus Community Bot — Comando /tapa (com GIF e retribuir)
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

const MESSAGES = [
    '{user} deu um tapa em {target}! 👋💥',
    '{user} estapeou {target} com força! 🫸',
    '{user} acertou um tapa em {target}! PLAFT! 💢',
    '{user} não pensou duas vezes e deu um tapa em {target}!',
];

async function fetchGif() {
    try {
        const res = await fetch('https://api.waifu.pics/sfw/slap');
        const data = await res.json();
        return data.url;
    } catch {
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tapa')
        .setDescription('👋 Dê um tapa em alguém.')
        .addUserOption(o => o.setName('usuario').setDescription('Quem você quer tapar?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Você não pode se tapar!', flags: 64 });
        }

        const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, target.id, interaction.guildId, 2);
        let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2*' : '';

        const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
            .replace('{user}', interaction.user.toString())
            .replace('{target}', target.toString()) + extraMsg;

        const gifUrl = await fetchGif();

        const embed = new EmbedBuilder()
            .setColor(PALETTE.error)
            .setDescription(message)
            .setFooter(olympusFooter())
            .setTimestamp();

        if (gifUrl) embed.setImage(gifUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:slap:${target.id}:${interaction.user.id}`)
                .setLabel('👋 Retribuir Tapa')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
