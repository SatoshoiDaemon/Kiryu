// src/commands/admin/limpar.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const permissionsManager = require('@utils/managers/permissionsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limpar')
        .setDescription('🗑️ Remove mensagens do canal.')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Número de mensagens a remover (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
        .addUserOption(o => o.setName('usuario').setDescription('Filtrar mensagens de um usuário específico').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const member = await interaction.guild.members.fetch(interaction.user.id);

        if (!await permissionsManager.hasPermission(member, 'limpar', PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ Você não tem permissão para limpar mensagens.', flags: 64 });
        }

        const amount = interaction.options.getInteger('quantidade');
        const target = interaction.options.getUser('usuario');

        await interaction.deferReply({ flags: 64 });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: 100 });

            if (target) {
                messages = [...messages.filter(m => m.author.id === target.id).values()].slice(0, amount);
            } else {
                messages = [...messages.values()].slice(0, amount);
            }

            // Filtra mensagens com mais de 14 dias (não podem ser deletadas em bulk)
            const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 1209600000);

            if (deletable.length === 0) {
                return interaction.editReply({ content: '❌ Nenhuma mensagem elegível encontrada (mensagens com mais de 14 dias não podem ser deletadas em massa).' });
            }

            await interaction.channel.bulkDelete(deletable, true);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🗑️ Mensagens Removidas')
                .setDescription(`**${deletable.length}** mensagem(ns) removida(s) com sucesso.`)
                .setFooter(tengokuFooter())
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            return interaction.editReply({ content: `❌ Erro ao limpar mensagens: ${err.message}` });
        }
    },
};
