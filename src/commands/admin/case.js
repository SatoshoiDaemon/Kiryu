// src/commands/admin/case.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ModLog = require('@models/ModLog');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('case')
        .setDescription('🔍 Visualiza detalhes específicos de um caso de moderação (Case ID).')
        .addIntegerOption(o => o.setName('numero').setDescription('Número do Caso').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'case', PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para visualizar casos de moderação.', flags: 64 });
        }

        const caseIdParam = interaction.options.getInteger('numero');
        const guildId = interaction.guildId;

        // Busca o log correspondente ao Case ID na guilda atual
        const log = await ModLog.findOne({ guildId, caseId: caseIdParam });

        if (!log) {
            return interaction.reply({ content: `❌ Caso **#${caseIdParam}** não encontrado neste servidor.`, flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        // Tenta buscar os objetos de usuário (Moderador e Vítima)
        const targetUser = await interaction.client.users.fetch(log.userId).catch(() => null);
        const moderatorUser = await interaction.client.users.fetch(log.moderator).catch(() => null);

        const actionLabels = {
            'delete': '🗑️ Mensagem Deletada',
            'warn':   '⚠️ Aviso Emitido',
            'mute':   '🔇 Timeout Aplicado',
            'unmute': '🔊 Timeout Removido',
            'kick':   '👢 Usuário Expulso',
            'ban':    '🔨 Usuário Banido',
            'unban':  '🕊️ Usuário Desbanido'
        };

        const typeLabels = {
            'auto-spam':         '💬 Anti-Spam Automático',
            'auto-invite':       '🔗 Anti-Invite Automático',
            'auto-mass-mention': '📢 Anti-Menção Automática',
            'auto-everyone':     '📣 Anti-Everyone Automático',
            'auto-link':         '🌐 Anti-Links Automático',
            'auto-caps':         '🔠 Anti-Caps Automático',
        };

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle(`🔎 Detalhes do Caso #${log.caseId}`)
            .addFields(
                { name: 'Tipo de Ação', value: `\`${actionLabels[log.action] || typeLabels[log.action] || log.action}\``, inline: true },
                { name: 'Infrator', value: targetUser ? `${targetUser} (\`${log.userId}\`)` : `Desconhecido (\`${log.userId}\`)`, inline: true },
                { name: 'Moderador Responśavel', value: moderatorUser ? `${moderatorUser} (\`${log.moderator}\`)` : `Sistema/Desconhecido (\`${log.moderator}\`)`, inline: false },
                { name: 'Motivo Registrado', value: `> ${log.reason || 'Nenhum motivo fornecido no momento da infração.'}`, inline: false },
                { name: 'Data da Infração', value: `<t:${Math.floor(log.createdAt.getTime() / 1000)}:F>`, inline: false },
            )
            .setFooter(olympusFooter(`ID do Caso no Servidor: ${log.caseId}`))
            .setTimestamp(log.createdAt);

        if (targetUser) embed.setThumbnail(targetUser.displayAvatarURL());

        return interaction.editReply({ embeds: [embed] });
    },
};
