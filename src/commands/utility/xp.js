// src/commands/utility/xp.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const xpManager = require('@utils/managers/xpManager');
const permissionsManager = require('@utils/managers/permissionsManager');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('⭐ Veja seu progresso de nível e XP atual.')
        .addUserOption(o => o.setName('usuario').setDescription('Ver o XP de outro usuário.').setRequired(false)),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const target = interaction.options.getUser('usuario') || interaction.user;
        const config = await xpManager.getConfig(guildId);

        if (!config.enabled) {
            return interaction.reply({ content: '❌ O sistema de XP está desativado neste servidor.', flags: 64 });
        }

        const data = await xpManager.getUser(target.id, guildId);
        const progress = xpManager.getProgress(data.xp);
        const progressBar = buildProgressBar(progress.current, progress.required);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`⭐ XP de ${target.username}`)
            .addFields(
                { name: 'Nível', value: `**${progress.level}**`, inline: true },
                { name: 'XP Total', value: `**${progress.xp.toLocaleString('pt-BR')}**`, inline: true },
                { name: 'Próximo Nível', value: `**${progress.nextLevelXP.toLocaleString('pt-BR')} XP**`, inline: true },
                { name: `Progresso (${progress.percent}%)`, value: progressBar, inline: false },
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};

function buildProgressBar(current, total, length = 20) {
    const safeTotal = Math.max(1, Math.floor(Number(total) || 1));
    const safeCurrent = Math.min(safeTotal, Math.max(0, Math.floor(Number(current) || 0)));
    const filled = Math.min(length, Math.max(0, Math.floor((safeCurrent / safeTotal) * length)));
    const empty = Math.max(0, length - filled);
    return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` ${safeCurrent.toLocaleString('pt-BR')}/${safeTotal.toLocaleString('pt-BR')}`;
}
