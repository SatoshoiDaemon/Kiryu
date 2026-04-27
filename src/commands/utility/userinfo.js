// src/commands/utility/userinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const xpManager = require('@utils/managers/xpManager');
const economyManager = require('@utils/managers/economyManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('usuario')
        .setDescription('👤 Exibe informações sobre um usuário.')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário (padrão: você)').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario') || interaction.member;
        const user   = target.user;
        const guildId = interaction.guildId;

        const xpData  = await xpManager.getUser(user.id, guildId);
        const ecoData = await economyManager.getUser(user.id, guildId);
        const ecoConfig = await economyManager.getConfig(guildId);

        const roles = [...target.roles.cache.values()]
            .filter(r => r.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .slice(0, 5)
            .map(r => `${r}`)
            .join(', ') || '`Nenhum`';

        const embed = new EmbedBuilder()
            .setColor(target.displayHexColor || PALETTE.primary)
            .setTitle(`👤 ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: 'ID', value: `\`${user.id}\``, inline: true },
                { name: 'Apelido', value: target.nickname || '`Nenhum`', inline: true },
                { name: 'Bot', value: user.bot ? '✅ Sim' : '❌ Não', inline: true },
                { name: 'Conta criada em', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                { name: 'Entrou no servidor', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
                { name: 'Cargos principais', value: roles, inline: false },
                { name: '⭐ XP', value: `Nível **${xpData.level}** (${xpData.xp.toLocaleString('pt-BR')} XP)`, inline: true },
                { name: `${ecoConfig.currencySymbol} Economia`, value: `**${economyManager.formatCurrency(ecoData.balance + ecoData.bank, ecoConfig, { withName: true })}**`, inline: true },
            )
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
