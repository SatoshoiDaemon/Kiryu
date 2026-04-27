// src/commands/admin/role.js
// ============================================================
//   Olympus Community Bot — Gerenciamento de Cargos
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('🛡️ Gerencia e visualiza informações de cargos do servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub => sub.setName('add').setDescription('➕ Adiciona ou remove um cargo de um membro')
            .addUserOption(o => o.setName('membro').setDescription('O membro alvo').setRequired(true))
            .addRoleOption(o => o.setName('cargo').setDescription('O cargo a ser aplicado').setRequired(true)))
        .addSubcommand(sub => sub.setName('info').setDescription('ℹ️ Exibe informações detalhadas de um cargo')
            .addRoleOption(o => o.setName('cargo').setDescription('O cargo alvo').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const memberOption = interaction.options.getMember('membro');
            const role = interaction.options.getRole('cargo');

            if (!memberOption) {
                return interaction.reply({ content: '❌ O membro não foi encontrado no servidor.', flags: 64 });
            }

            // Verifica hierarquia
            const botMaxRole = interaction.guild.members.me.roles.highest.position;
            if (role.position >= botMaxRole) {
                return interaction.reply({ content: '❌ Não posso gerenciar este cargo pois ele está acima ou igual ao meu cargo mais alto.', flags: 64 });
            }

            if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ content: '❌ Você não pode gerenciar um cargo que seja maior ou igual ao seu.', flags: 64 });
            }

            let wasAdded = false;
            try {
                if (memberOption.roles.cache.has(role.id)) {
                    await memberOption.roles.remove(role);
                } else {
                    await memberOption.roles.add(role);
                    wasAdded = true;
                }

                const embed = new EmbedBuilder()
                    .setColor(wasAdded ? PALETTE.success : PALETTE.error)
                    .setTitle('🛡️ Gerenciamento de Cargos')
                    .setDescription(`O cargo ${role} foi **${wasAdded ? 'adicionado a' : 'removido de'}** ${memberOption}.`)
                    .setFooter(olympusFooter())
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            } catch (err) {
                return interaction.reply({ content: `❌ Falha ao tentar alterar o cargo: ${err.message}`, flags: 64 });
            }
        }

        if (sub === 'info') {
            const role = interaction.options.getRole('cargo');

            const permissionsArray = role.permissions.toArray().map(p => {
                return p.replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, l => l.toUpperCase());
            });

            const permsText = permissionsArray.includes('Administrator') 
                ? '⭐ Administrador (Todas as permissões)' 
                : permissionsArray.slice(0, 10).join(', ') + (permissionsArray.length > 10 ? `... (+${permissionsArray.length - 10})` : '');

            const embed = new EmbedBuilder()
                .setColor(role.hexColor !== '#000000' ? role.hexColor : PALETTE.primary)
                .setTitle(`📌 Informações do Cargo: ${role.name}`)
                .addFields(
                    { name: '🆔 ID do Cargo', value: `\`${role.id}\``, inline: true },
                    { name: '🎨 Cor Hex', value: `\`${role.hexColor}\``, inline: true },
                    { name: '👥 Membros', value: `${role.members.size}`, inline: true },
                    { name: '🛡️ Destacado?', value: role.hoist ? '✅ Sim' : '❌ Não', inline: true },
                    { name: '🗣️ Mencionável?', value: role.mentionable ? '✅ Sim' : '❌ Não', inline: true },
                    { name: '⚙️ Posição', value: `${role.position}`, inline: true },
                    { name: '📅 Criado em', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: '🔑 Permissões Chave', value: permsText || '`Nenhuma`', inline: false },
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            if (role.icon) {
                embed.setThumbnail(role.iconURL({ size: 1024 }));
            }

            return interaction.reply({ embeds: [embed] });
        }
    },
};
