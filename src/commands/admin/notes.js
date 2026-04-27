// src/commands/admin/notes.js
// ============================================================
//   Olympus Community Bot — Notas de Moderação
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Note = require('@models/Note');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notes')
        .setDescription('📝 Gerencie notas de moderação de um membro.')
        .addSubcommand(sub => sub.setName('add').setDescription('📝 Adicionar nota')
            .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
            .addStringOption(o => o.setName('texto').setDescription('Conteúdo da nota').setRequired(true).setMaxLength(500)))
        .addSubcommand(sub => sub.setName('ver').setDescription('👀 Ver notas de um membro')
            .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('🗑️ Remover uma nota específica')
            .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
            .addIntegerOption(o => o.setName('indice').setDescription('Índice da nota (veja com /notes ver)').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('wipe').setDescription('💣 Remover todas as notas de um membro')
            .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser('usuario');
        const guildId = interaction.guildId;

        if (sub === 'add') {
            const content = interaction.options.getString('texto');
            await Note.create({ guildId, userId: target.id, moderator: interaction.user.id, content });

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('📝 Nota Adicionada')
                .setDescription(`Nota adicionada para ${target}:\n> ${content}`)
                .setFooter(olympusFooter(`Por ${interaction.user.tag}`))
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'ver') {
            const notes = await Note.find({ guildId, userId: target.id }).sort({ createdAt: -1 });
            if (!notes.length) return interaction.reply({ content: `📝 ${target} não tem notas.`, flags: 64 });

            const embed = new EmbedBuilder()
                .setColor(PALETTE.info)
                .setTitle(`📝 Notas de ${target.username}`)
                .setDescription(notes.map((n, i) => {
                    const date = n.createdAt.toLocaleDateString('pt-BR');
                    return `**${i + 1}.** ${n.content}\n> Por <@${n.moderator}> — \`${date}\``;
                }).join('\n\n'))
                .setThumbnail(target.displayAvatarURL())
                .setFooter(olympusFooter(`${notes.length} nota(s)`))
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (sub === 'remove') {
            const index = interaction.options.getInteger('indice') - 1;
            const notes = await Note.find({ guildId, userId: target.id }).sort({ createdAt: -1 });

            if (index < 0 || index >= notes.length) {
                return interaction.reply({ content: `❌ Índice inválido. Use \`/notes ver\` para ver os índices (1-${notes.length}).`, flags: 64 });
            }

            await Note.findByIdAndDelete(notes[index]._id);
            return interaction.reply({ content: `✅ Nota **#${index + 1}** de ${target} removida.`, flags: 64 });
        }

        if (sub === 'wipe') {
            const result = await Note.deleteMany({ guildId, userId: target.id });
            return interaction.reply({ content: `✅ Todas as **${result.deletedCount}** notas de ${target} foram removidas.`, flags: 64 });
        }
    },
};
