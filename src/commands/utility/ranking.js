// src/commands/utility/ranking.js
// ============================================================
//   Olympus Community Bot — Ranking Unificado
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserData = require('@models/UserData');
const PartnershipTrack = require('@models/PartnershipTrack');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('🏆 Veja os rankings do servidor.')
        .addStringOption(o => o.setName('tipo').setDescription('Tipo de ranking').setRequired(true)
            .addChoices(
                { name: '⭐ XP', value: 'xp' },
                { name: '💰 Dinheiro', value: 'dinheiro' },
                { name: '🤝 Parcerias', value: 'parcerias' },
                { name: '💬 Mensagens', value: 'mensagens' },
                { name: '🎙️ Tempo em Call', value: 'voz' },
                { name: '📨 Invites', value: 'invites' },
            )),

    async execute(interaction) {
        await interaction.deferReply();
        const type = interaction.options.getString('tipo');
        const guildId = interaction.guildId;

        let title, data, formatRow;

        switch (type) {
            case 'xp':
                title = '⭐ Ranking de XP';
                data = await UserData.find({ guildId, 'xp.current': { $gt: 0 } }).sort({ 'xp.current': -1 }).limit(10);
                formatRow = (d) => `Lvl **${d.xp.level}** — ${d.xp.current} XP`;
                break;
            case 'dinheiro':
                title = '💰 Ranking de Riqueza';
                data = await UserData.aggregate([
                    { $match: { guildId } },
                    { $addFields: { totalWealth: { $add: [{ $ifNull: ['$economy.balance', 0] }, { $ifNull: ['$economy.bank', 0] }] } } },
                    { $sort: { totalWealth: -1 } },
                    { $limit: 10 }
                ]);
                formatRow = (d) => `**${(d.totalWealth || 0).toLocaleString()}** moedas`;
                break;
            case 'parcerias':
                title = '🤝 Ranking de Parcerias (Staff)';
                data = await PartnershipTrack.find({ guildId }).sort({ count: -1 }).limit(10);
                formatRow = (d) => `**${d.count}** parceria${d.count !== 1 ? 's' : ''}`;
                break;
            case 'mensagens':
                title = '💬 Ranking de Mensagens';
                data = await UserData.find({ guildId, 'stats.messages': { $gt: 0 } }).sort({ 'stats.messages': -1 }).limit(10);
                formatRow = (d) => `**${(d.stats?.messages || 0).toLocaleString()}** msgs`;
                break;
            case 'voz':
                title = '🎙️ Ranking de Tempo em Call';
                data = await UserData.find({ guildId, 'stats.voiceMinutes': { $gt: 0 } }).sort({ 'stats.voiceMinutes': -1 }).limit(10);
                formatRow = (d) => {
                    const mins = d.stats?.voiceMinutes || 0;
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    return `**${h}h ${m}m**`;
                };
                break;
            case 'invites':
                title = '📨 Ranking de Invites';
                data = await UserData.find({ guildId, 'stats.invites': { $gt: 0 } }).sort({ 'stats.invites': -1 }).limit(10);
                formatRow = (d) => `**${d.stats?.invites || 0}** invite${(d.stats?.invites || 0) !== 1 ? 's' : ''}`;
                break;
        }

        if (!data || !data.length) {
            return interaction.editReply({ content: `📊 O ranking de **${type}** está vazio por enquanto.` });
        }

        let description = '';
        for (let i = 0; i < data.length; i++) {
            const entry = data[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`${i + 1}.\``;
            const uid = entry.userId;
            description += `${medal} <@${uid}> — ${formatRow(entry)}\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`🏆 TOP 10 — ${title}`)
            .setDescription(description)
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },
};
