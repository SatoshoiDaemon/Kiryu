// src/commands/admin/mute.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');
const { registerModLog, sendModLogChannel } = require('@utils/helpers/modHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Silencia (timeout) um usuário no servidor.')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário a ser silenciado').setRequired(true))
        .addStringOption(o => o.setName('tempo').setDescription('Tempo de duração (ex: 10m, 1h, 1d)').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo do mute').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'mute', PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ Você não tem permissão para silenciar usuários.', flags: 64 });
        }

        const target = interaction.options.getUser('usuario');
        const timeInput = interaction.options.getString('tempo');
        const reason = interaction.options.getString('motivo') || 'Nenhum motivo informado';

        const msTime = ms(timeInput);
        if (!msTime || msTime < 10000 || msTime > 2419200000) { // Mínimo 10s, máximo 28d
            return interaction.reply({ content: '❌ Tempo inválido! O Discord aceita entre 10 segundos e 28 dias. Ex: `10m`, `2h`, `1d`.', flags: 64 });
        }

        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', flags: 64 });
        }

        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: '❌ Não posso silenciar um usuário com cargo igual ou superior ao meu.', flags: 64 });
        }
        if (targetMember.roles.highest.position >= member.roles.highest.position) {
            return interaction.reply({ content: '❌ Você não pode silenciar um usuário com cargo igual ou superior ao seu.', flags: 64 });
        }

        try {
            await targetMember.timeout(msTime, reason);
        } catch (err) {
            return interaction.reply({ content: `❌ Erro ao aplicar timeout: ${err.message}`, flags: 64 });
        }

        // Registra no banco e obtém caseId
        const timeDisplay = ms(msTime, { long: true }).replace('ms', ' milissegundos').replace('s', ' segundos').replace('m', ' minutos').replace('h', ' horas').replace('d', ' dias');
        const fullReason = `${reason} (Duração: ${timeDisplay})`;
        
        const log = await registerModLog(interaction.guildId, target.id, interaction.user.id, 'mute', fullReason);
        const caseId = log ? log.caseId : '?';

        // Log no canal configurado
        await sendModLogChannel(interaction, target.id, target.username, 'mute', fullReason, caseId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.warning)
            .setTitle(`🔇 Usuário Silenciado | Caso #${caseId}`)
            .setDescription(`**${target.username}** foi silenciado por **${timeDisplay}**.`)
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
