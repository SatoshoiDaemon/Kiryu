// src/commands/admin/logs.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ModLog = require('@models/ModLog');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registros')
        .setDescription('📋 Visualiza o histórico de moderação do servidor.')
        .addUserOption(o => o.setName('usuario').setDescription('Filtrar por usuário').setRequired(false))
        .addStringOption(o => o.setName('acao').setDescription('Filtrar por ação').setRequired(false)
            .addChoices(
                { name: 'Ban', value: 'ban' },
                { name: 'Kick', value: 'kick' },
                { name: 'Warn', value: 'warn' },
                { name: 'Mute/Timeout', value: 'mute' },
                { name: 'Auto-Spam', value: 'auto-spam' },
                { name: 'Auto-Invite', value: 'auto-invite' },
                { name: 'Auto-Menção', value: 'auto-mass-mention' },
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'logs', PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para ver os logs.', flags: 64 });
        }

        const target = interaction.options.getUser('usuario');
        const action = interaction.options.getString('acao');

        let query = { guildId: interaction.guildId };
        if (target) query.userId = target.id;
        if (action) query.action = action;

        const logs = await ModLog.find(query).sort({ createdAt: -1 }).limit(15);

        if (!logs.length) {
            return interaction.reply({ content: '📋 Nenhum registro encontrado com os filtros aplicados.', flags: 64 });
        }

        const actionEmoji = {
            'ban': '🔨', 'kick': '👢', 'warn': '⚠️', 'mute': '🔇',
            'auto-spam': '💬', 'auto-invite': '🔗', 'auto-mass-mention': '📢',
            'auto-everyone': '📣', 'auto-link': '🌐', 'auto-caps': '🔠',
        };

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('📋 Histórico de Moderação')
            .setDescription(
                logs.map(log => {
                    const emoji = actionEmoji[log.action] || '📌';
                    const date = log.createdAt.toLocaleDateString('pt-BR');
                    return `**#${log.caseId || '?'}** | ${emoji} **${log.action}** — <@${log.userId}> — \`${date}\`\n> ${log.reason || 'Sem motivo'}`;
                }).join('\n\n')
            )
            .setFooter(tengokuFooter(`${logs.length} registro(s) encontrado(s)`))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: 64 });
    },
};
