// src/commands/admin/verificar.js
// ============================================================
//   Tengoku Community Bot — Verificação Manual
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verificar')
        .setDescription('🛡️ Verifica um membro manualmente ignorando o captcha.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(o => o.setName('membro').setDescription('O membro a ser verificado').setRequired(true)),

    async execute(interaction) {
        const targetMember = interaction.options.getMember('membro');
        if (!targetMember) return interaction.reply({ content: '❌ Membro não encontrado.', flags: 64 });

        const guildDoc = await Guild.findOne({ guildId: interaction.guildId });
        const config = guildDoc?.verificationConfig;

        if (!config?.roleId) {
            return interaction.reply({ content: '❌ O cargo de verificação não está configurado. Use `/setup verificacao config`.', flags: 64 });
        }

        const role = interaction.guild.roles.cache.get(config.roleId);
        if (!role) return interaction.reply({ content: '❌ Cargo de verificação não encontrado no servidor.', flags: 64 });

        try {
            await targetMember.roles.add(role);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🛡️ Verificação Manual')
                .setDescription(`${targetMember} foi verificado com sucesso por ${interaction.user}.`)
                .setFooter(tengokuFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            return interaction.reply({ content: `❌ Falha ao dar o cargo de verificação: ${err.message}`, flags: 64 });
        }
    },
};
