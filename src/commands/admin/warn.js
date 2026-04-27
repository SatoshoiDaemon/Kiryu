// src/commands/admin/warn.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');
const { registerModLog, sendModLogChannel } = require('@utils/helpers/modHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Aplica uma advertência a um usuário.')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário a ser advertido').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo da advertência').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'warn', PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para advertir usuários.', flags: 64 });
        }

        const target = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo');

        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (targetMember) {
            const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
            if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
                return interaction.reply({ content: '❌ Não posso advertir um usuário com cargo igual ou superior ao meu.', flags: 64 });
            }
            if (targetMember.roles.highest.position >= member.roles.highest.position) {
                return interaction.reply({ content: '❌ Você não pode advertir um usuário com cargo igual ou superior ao seu.', flags: 64 });
            }
        }

        // Tenta enviar DM para o usuário
        if (targetMember) {
            const dmEmbed = new EmbedBuilder()
                .setColor(PALETTE.warning)
                .setTitle(`⚠️ Você recebeu uma advertência em ${interaction.guild.name}`)
                .setDescription(`**Motivo:** ${reason}`)
                .setFooter(olympusFooter())
                .setTimestamp();
            await targetMember.send({ embeds: [dmEmbed] }).catch(() => null);
        }

        // Registra no banco e obtém caseId
        const log = await registerModLog(interaction.guildId, target.id, interaction.user.id, 'warn', reason);
        const caseId = log ? log.caseId : '?';

        // Log no canal configurado
        await sendModLogChannel(interaction, target.id, target.username, 'warn', reason, caseId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.warning)
            .setTitle(`⚠️ Usuário Advertido | Caso #${caseId}`)
            .setDescription(`**${target.username}** foi advertido.`)
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
