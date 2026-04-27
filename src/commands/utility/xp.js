// src/commands/utility/xp.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const xpManager = require('@utils/managers/xpManager');
const permissionsManager = require('@utils/managers/permissionsManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

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
        const nextLevelXP = xpManager.xpForLevel(data.level + 1);
        const progress = Math.floor((data.xp / nextLevelXP) * 100);

        const progressBar = buildProgressBar(data.xp, nextLevelXP);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`⭐ XP de ${target.username}`)
            .addFields(
                { name: 'Nível', value: `**${data.level}**`, inline: true },
                { name: 'XP Total', value: `**${data.xp.toLocaleString('pt-BR')}**`, inline: true },
                { name: 'Próximo Nível', value: `**${nextLevelXP.toLocaleString('pt-BR')} XP**`, inline: true },
                { name: `Progresso (${progress}%)`, value: progressBar, inline: false },
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};

function buildProgressBar(current, total, length = 20) {
    const filled = Math.floor((current / total) * length);
    const empty  = length - filled;
    return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` ${current}/${total}`;
}
