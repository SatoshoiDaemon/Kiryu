// src/commands/admin/hackban.js
// ============================================================
//   Olympus Community Bot — Hack Ban (ban por ID)
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { registerModLog } = require('@utils/helpers/modHelper');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hackban')
        .setDescription('🔨 Bane um usuário pelo ID, sem que ele esteja no servidor.')
        .addStringOption(o => o.setName('id').setDescription('ID do usuário').setRequired(true))
        .addStringOption(o => o.setName('motivo').setDescription('Motivo do ban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userId = interaction.options.getString('id');
        const reason = interaction.options.getString('motivo') || 'Sem motivo especificado';

        // Validar se é um ID válido (somente números, 17-20 dígitos)
        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({ content: '❌ ID inválido. Um ID do Discord contém 17-20 dígitos numéricos.', flags: 64 });
        }

        // Não permitir banir a si mesmo
        if (userId === interaction.user.id) {
            return interaction.reply({ content: '❌ Você não pode banir a si mesmo.', flags: 64 });
        }

        try {
            await interaction.guild.members.ban(userId, { reason, deleteMessageSeconds: 86400 });

            const log = await registerModLog(interaction.guildId, userId, interaction.user.id, 'hackban', reason);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.error)
                .setTitle('🔨 Hack Ban Aplicado')
                .setDescription(`Usuário \`${userId}\` foi banido do servidor.`)
                .addFields(
                    { name: 'Motivo', value: reason, inline: false },
                    { name: 'Moderador', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false },
                    { name: 'Caso', value: `#${log?.caseId || '?'}`, inline: true },
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            return interaction.reply({ content: `❌ Não foi possível banir este ID: ${err.message}`, flags: 64 });
        }
    },
};
