// src/commands/admin/unmute.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');
const { registerModLog, sendModLogChannel } = require('@utils/helpers/modHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('🔊 Remove o silenciamento (timeout) de um usuário.')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário a ser desmutado').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo do unmute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'unmute', PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para remover silenciamentos.', flags: 64 });
        }

        const target = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo informado';

        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', flags: 64 });
        }

        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: '❌ Não posso desmutar um usuário com cargo igual ou superior ao meu.', flags: 64 });
        }
        if (targetMember.roles.highest.position >= member.roles.highest.position) {
            return interaction.reply({ content: '❌ Você não pode desmutar um usuário com cargo igual ou superior ao seu.', flags: 64 });
        }

        // Verifica se o usuário de fato está mutado (comunicando com o cooldown ativo)
        if (!targetMember.isCommunicationDisabled()) {
            return interaction.reply({ content: '❌ Este usuário não está silenciado.', flags: 64 });
        }

        try {
            await targetMember.timeout(null, reason);
        } catch (err) {
            return interaction.reply({ content: `❌ Erro ao remover timeout: ${err.message}`, flags: 64 });
        }

        // Registra no banco e obtém caseId
        const log = await registerModLog(interaction.guildId, target.id, interaction.user.id, 'unmute', reason);
        const caseId = log ? log.caseId : '?';

        // Log no canal configurado
        await sendModLogChannel(interaction, target.id, target.username, 'unmute', reason, caseId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle(`🔊 Usuário Desmutado | Caso #${caseId}`)
            .setDescription(`**${target.username}** teve o silenciamento removido.`)
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
