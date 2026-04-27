// src/commands/social/beijar.js
// ============================================================
//   Tengoku Community Bot — Comando /beijar (com GIF e retribuir)
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const marriageManager = require('@utils/managers/marriageManager');

const MESSAGES = [
    '{user} deu um beijo em {target}! 💋',
    '{user} beijou {target} com carinho! 💕',
    '{user} deu um beijinho fofo em {target}! 😘',
    '{user} surpreendeu {target} com um beijo! 💗',
];

async function fetchGif() {
    try {
        const res = await fetch('https://api.waifu.pics/sfw/kiss');
        const data = await res.json();
        return data.url;
    } catch {
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('beijar')
        .setDescription('💋 Dê um beijo em alguém.')
        .addUserOption(o => o.setName('usuario').setDescription('Quem você quer beijar?').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Você não pode se beijar!', flags: 64 });
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
            .setFooter(tengokuFooter())
            .setTimestamp();

        if (gifUrl) embed.setImage(gifUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rp:kiss:${target.id}:${interaction.user.id}`)
                .setLabel('💋 Retribuir Beijo')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};
