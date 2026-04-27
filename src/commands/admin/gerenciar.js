// src/commands/admin/gerenciar.js
// ============================================================
//   Tengoku Community Bot — Comandos de Gerenciamento
//   Para moderadores alterarem saldo, XP ou nível de membros
// ============================================================

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const xpManager = require('@utils/managers/xpManager');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gerenciar')
        .setDescription('⚙️ Gerencie XP, nível e moedas de um membro.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName('moedas')
                .setDescription('Adicione, remova ou defina moedas de um usuário.')
                .addUserOption(opt => opt.setName('usuario').setDescription('O usuário alvo.').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('acao')
                        .setDescription('Ação a ser realizada')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover', value: 'remove' },
                            { name: 'Definir', value: 'set' }
                        )
                )
                .addIntegerOption(opt => opt.setName('quantia').setDescription('Quantidade de moedas.').setRequired(true).setMinValue(0))
        )
        .addSubcommand(sub =>
            sub
                .setName('xp')
                .setDescription('Adicione, remova ou defina XP de um usuário.')
                .addUserOption(opt => opt.setName('usuario').setDescription('O usuário alvo.').setRequired(true))
                .addStringOption(opt =>
                    opt.setName('acao')
                        .setDescription('Ação a ser realizada')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Adicionar', value: 'add' },
                            { name: 'Remover', value: 'remove' },
                            { name: 'Definir', value: 'set' }
                        )
                )
                .addIntegerOption(opt => opt.setName('quantia').setDescription('Quantidade de XP.').setRequired(true).setMinValue(0))
        )
        .addSubcommand(sub =>
            sub
                .setName('nivel')
                .setDescription('Defina o nível de um usuário.')
                .addUserOption(opt => opt.setName('usuario').setDescription('O usuário alvo.').setRequired(true))
                .addIntegerOption(opt => opt.setName('nivel').setDescription('O novo nível.').setRequired(true).setMinValue(0))
        ),

    async execute(interaction) {
        const subCmd = interaction.options.getSubcommand();
        const target = interaction.options.getUser('usuario');
        const guildId = interaction.guildId;

        // --- GERENCIAR MOEDAS ---
        if (subCmd === 'moedas') {
            const action = interaction.options.getString('acao');
            let amount = interaction.options.getInteger('quantia');
            if (action === 'add') {
                await economyManager.addBalance(target.id, guildId, amount);
            } else if (action === 'remove') {
                await economyManager.addBalance(target.id, guildId, -amount);
            } else if (action === 'set') {
                // Para "setar", usamos setBalance diretamente
                await economyManager.setBalance(target.id, guildId, amount);
            }

            const novoSaldo = await economyManager.getUser(target.id, guildId);
            const conf = await economyManager.getConfig(guildId);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('⚙️ Gerenciamento — Moedas')
                .setDescription(`A conta de ${target} foi atualizada com sucesso.`)
                .addFields(
                    { name: 'Ação', value: action.toUpperCase(), inline: true },
                    { name: 'Quantia', value: economyManager.formatCurrency(amount, conf), inline: true },
                    { name: 'Novo Saldo', value: economyManager.formatCurrency(novoSaldo.balance, conf), inline: false }
                )
                .setFooter(tengokuFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // --- GERENCIAR XP ---
        if (subCmd === 'xp') {
            const action = interaction.options.getString('acao');
            const amount = interaction.options.getInteger('quantia');

            if (action === 'add') {
                await xpManager.addXP(target.id, guildId, amount);
            } else if (action === 'remove') {
                await xpManager.removeXP(target.id, guildId, amount);
            } else if (action === 'set') {
                await xpManager.setXP(target.id, guildId, amount);
            }

            const novoData = await xpManager.getUser(target.id, guildId);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('⚙️ Gerenciamento — XP')
                .setDescription(`A conta de ${target} foi atualizada com sucesso.`)
                .addFields(
                    { name: 'Ação', value: action.toUpperCase(), inline: true },
                    { name: 'Quantia', value: `${amount} XP`, inline: true },
                    { name: 'Novo XP Total', value: `${novoData.xp.toLocaleString('pt-BR')} XP`, inline: true },
                    { name: 'Novo Nível', value: `${novoData.level}`, inline: true }
                )
                .setFooter(tengokuFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // --- GERENCIAR LEVEL ---
        if (subCmd === 'nivel') {
            const nivel = interaction.options.getInteger('nivel');
            const updated = await xpManager.setLevel(target.id, guildId, nivel);

            // Tenta entregar o cargo se houver
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);
            if (member) await xpManager.updateMemberRole(member);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('⚙️ Gerenciamento — Nível')
                .setDescription(`A conta de ${target} foi atualizada com sucesso.`)
                .addFields(
                    { name: 'Ação', value: 'DEFINIR NÍVEL', inline: true },
                    { name: 'Novo Nível', value: `${updated.level}`, inline: true },
                    { name: 'XP Reajustado', value: `${updated.xp.toLocaleString('pt-BR')} XP`, inline: false }
                )
                .setFooter(tengokuFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    },
};
