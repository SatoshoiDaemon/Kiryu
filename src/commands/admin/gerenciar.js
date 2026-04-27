// src/commands/admin/gerenciar.js
// ============================================================
//   Olympus Community Bot — Comandos de Gerenciamento
//   Para moderadores alterarem saldo, XP ou level de membros
// ============================================================

const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const xpManager = require('@utils/managers/xpManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gerenciar')
        .setDescription('⚙️ Gerencia XP, Level e Dinheiro de um membro (Admin).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand(sub =>
            sub
                .setName('moedas')
                .setDescription('Adiciona, remove ou define moedas de um usuário.')
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
                .addIntegerOption(opt => opt.setName('quantia').setDescription('A quantidade de moedas.').setRequired(true).setMinValue(0))
        )
        .addSubcommand(sub =>
            sub
                .setName('xp')
                .setDescription('Adiciona, remove ou define XP de um usuário.')
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
                .addIntegerOption(opt => opt.setName('quantia').setDescription('A quantidade de XP.').setRequired(true).setMinValue(0))
        )
        .addSubcommand(sub =>
            sub
                .setName('level')
                .setDescription('Define o Level de um usuário.')
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
            const data = await economyManager.getUser(target.id, guildId);

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
                    { name: 'Quantia', value: `${amount} ${conf.currencySymbol}`, inline: true },
                    { name: 'Novo Saldo', value: `${novoSaldo.balance} ${conf.currencySymbol}`, inline: false }
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // --- GERENCIAR XP ---
        if (subCmd === 'xp') {
            const action = interaction.options.getString('acao');
            const amount = interaction.options.getInteger('quantia');
            const data = await xpManager.getUser(target.id, guildId);

            if (action === 'add') {
                await xpManager.addXP(target.id, guildId, amount);
            } else if (action === 'remove') {
                const newXp = Math.max(0, data.xp - amount);
                const UserData = require('@models/UserData');
                await UserData.findOneAndUpdate(
                    { userId: target.id, guildId },
                    { $set: { 'xp.current': newXp } }
                );
            } else if (action === 'set') {
                const UserData = require('@models/UserData');
                await UserData.findOneAndUpdate(
                    { userId: target.id, guildId },
                    { $set: { 'xp.current': amount } }
                );
            }

            const novoData = await xpManager.getUser(target.id, guildId);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('⚙️ Gerenciamento — XP')
                .setDescription(`A conta de ${target} foi atualizada com sucesso.`)
                .addFields(
                    { name: 'Ação', value: action.toUpperCase(), inline: true },
                    { name: 'Quantia', value: `${amount} XP`, inline: true },
                    { name: 'Novo XP Total', value: `${novoData.xp} XP`, inline: false }
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // --- GERENCIAR LEVEL ---
        if (subCmd === 'level') {
            const nivel = interaction.options.getInteger('nivel');
            // Calcula qual o mínimo de XP pra chegar nesse nível exato e atualiza
            // Fórmula padrão: required = level * level * 100
            const minimalXpForLevel = nivel * nivel * 100;
            
            const UserData = require('@models/UserData');
            await UserData.findOneAndUpdate(
                { userId: target.id, guildId },
                { $set: { 'xp.level': nivel, 'xp.current': minimalXpForLevel } },
                { upsert: true }
            );

            // Tenta entregar o cargo se houver
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);
            if (member) await xpManager.updateMemberRole(member);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('⚙️ Gerenciamento — Level')
                .setDescription(`A conta de ${target} foi atualizada com sucesso.`)
                .addFields(
                    { name: 'Ação', value: 'SET LEVEL', inline: true },
                    { name: 'Novo Nível', value: `${nivel}`, inline: true },
                    { name: 'XP Reajustado', value: `${minimalXpForLevel} XP`, inline: false }
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    },
};
