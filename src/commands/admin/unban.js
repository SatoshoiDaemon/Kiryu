// src/commands/admin/unban.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');
const { registerModLog, sendModLogChannel } = require('@utils/helpers/modHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('🕊️ Desbane um usuário do servidor.')
        .addStringOption(o => o.setName('user_id').setDescription('ID do usuário a ser desbanido').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo do desbanimento').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'unban', PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para desbanir usuários.', flags: 64 });
        }

        const targetId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo informado';

        // Verifica se o ID é válido
        if (!/^\d{17,19}$/.test(targetId)) {
            return interaction.reply({ content: '❌ ID do usuário inválido.', flags: 64 });
        }

        // Obtém o usuário (através da API, pois pode não estar no servidor / cache)
        const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
        if (!targetUser) {
            return interaction.reply({ content: '❌ Usuário não encontrado.', flags: 64 });
        }

        try {
            // Tenta remover o banimento
            await interaction.guild.members.unban(targetId, reason);
        } catch (err) {
            if (err.code === 10026) {
                return interaction.reply({ content: '❌ Este usuário não está banido.', flags: 64 });
            }
            return interaction.reply({ content: `❌ Erro ao desbanir: ${err.message}`, flags: 64 });
        }

        // Registra no banco e obtém caseId
        const log = await registerModLog(interaction.guildId, targetId, interaction.user.id, 'unban', reason);
        const caseId = log ? log.caseId : '?';

        // Log no canal configurado
        await sendModLogChannel(interaction, targetId, targetUser.username, 'unban', reason, caseId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle(`🕊️ Usuário Desbanido | Caso #${caseId}`)
            .setDescription(`**${targetUser.username}** foi desbanido do servidor.`)
            .addFields(
                { name: 'Moderador', value: `${interaction.user}`, inline: true },
                { name: 'Motivo', value: reason, inline: true },
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
