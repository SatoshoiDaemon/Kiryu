// src/commands/economy/inventario.js
// ============================================================
//   Olympus Community Bot — Inventário do Usuário
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserData = require('@models/UserData');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventario')
        .setDescription('🎒 Veja seu inventário de itens.')
        .addUserOption(o => o.setName('usuario').setDescription('Ver inventário de outro usuário').setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const guildId = interaction.guildId;

        const userDoc = await UserData.findOne({ userId: target.id, guildId });
        const inventory = userDoc?.inventory?.filter(i => i.quantity > 0) || [];

        if (!inventory.length) {
            return interaction.reply({ content: target.id === interaction.user.id ? '🎒 Seu inventário está vazio. Compre itens com `/loja comprar`.' : `🎒 ${target} não tem itens no inventário.`, flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`🎒 Inventário de ${target.username}`)
            .setDescription(inventory.map((item, i) => 
                `**${i + 1}.** ${item.productName} — x${item.quantity}`
            ).join('\n'))
            .setThumbnail(target.displayAvatarURL())
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
