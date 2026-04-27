// src/commands/admin/ban.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');
const { registerModLog, sendModLogChannel } = require('@utils/helpers/modHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Bane um usuário do servidor.')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário a ser banido').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo do banimento').setRequired(false))
        .addIntegerOption(o => o.setName('dias').setDescription('Dias de mensagens a deletar (0-7)').setMinValue(0).setMaxValue(7).setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'ban', PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para banir usuários.', flags: 64 });
        }

        const target = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo informado';
        const days   = interaction.options.getInteger('dias') || 0;

        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', flags: 64 });
        }

        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: '❌ Não posso banir um usuário com cargo igual ou superior ao meu.', flags: 64 });
        }
        if (targetMember.roles.highest.position >= member.roles.highest.position) {
            return interaction.reply({ content: '❌ Você não pode banir um usuário com cargo igual ou superior ao seu.', flags: 64 });
        }

        try {
            await targetMember.ban({ reason, deleteMessageSeconds: days * 86400 });
        } catch (err) {
            return interaction.reply({ content: `❌ Erro ao banir usuário: ${err.message}`, flags: 64 });
        }

        // Registra no banco e obtém caseId
        const log = await registerModLog(interaction.guildId, target.id, interaction.user.id, 'ban', reason);
        const caseId = log ? log.caseId : '?';

        // Log no canal configurado
        await sendModLogChannel(interaction, target.id, target.username, 'ban', reason, caseId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.error)
            .setTitle(`🔨 Usuário Banido | Caso #${caseId}`)
            .setDescription(`**${target.username}** foi banido do servidor.`)
            .addFields(
                { name: 'Moderador', value: `${interaction.user}`, inline: true },
                { name: 'Motivo', value: reason, inline: true },
                { name: 'Mensagens deletadas', value: `${days} dia(s)`, inline: true },
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
