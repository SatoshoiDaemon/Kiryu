// src/commands/admin/kick.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');
const { registerModLog, sendModLogChannel } = require('@utils/helpers/modHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Expulsa um usuário do servidor.')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário a ser expulso').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo da expulsão').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'kick', PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para expulsar usuários.', flags: 64 });
        }

        const target = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo informado';

        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!targetMember) return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', flags: 64 });

        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: '❌ Não posso expulsar um usuário com cargo igual ou superior ao meu.', flags: 64 });
        }
        if (targetMember.roles.highest.position >= member.roles.highest.position) {
            return interaction.reply({ content: '❌ Você não pode expulsar um usuário com cargo igual ou superior ao seu.', flags: 64 });
        }

        try {
            await targetMember.kick(reason);
        } catch (err) {
            return interaction.reply({ content: `❌ Erro ao expulsar usuário: ${err.message}`, flags: 64 });
        }

        // Registra no banco e obtém caseId
        const log = await registerModLog(interaction.guildId, target.id, interaction.user.id, 'kick', reason);
        const caseId = log ? log.caseId : '?';

        // Log no canal configurado
        await sendModLogChannel(interaction, target.id, target.username, 'kick', reason, caseId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.warning)
            .setTitle(`👢 Usuário Expulso | Caso #${caseId}`)
            .setDescription(`**${target.username}** foi expulso do servidor.`)
            .addFields(
                { name: 'Moderador', value: `${interaction.user}`, inline: true },
                { name: 'Motivo', value: reason, inline: true },
            )
            .setThumbnail(target.displayAvatarURL())
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
