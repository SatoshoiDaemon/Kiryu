// src/commands/economy/loja.js
// ============================================================
//   Olympus Community Bot — Loja de Itens
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ShopProduct } = require('@models/Shop');
const UserData = require('@models/UserData');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loja')
        .setDescription('🛒 Acesse a loja do servidor.')
        .addSubcommand(sub => sub.setName('ver').setDescription('📋 Veja os itens disponíveis'))
        .addSubcommand(sub => sub.setName('comprar').setDescription('🛒 Compre um item')
            .addStringOption(o => o.setName('item').setDescription('Nome do item').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        const config = await economyManager.getConfig(guildId);

        if (sub === 'ver') {
            const products = await ShopProduct.find({ guildId }).sort({ price: 1 });
            if (!products.length) return interaction.reply({ content: '🛒 A loja está vazia. Um admin pode adicionar itens via `/config`.', flags: 64 });

            const embed = new EmbedBuilder()
                .setColor(PALETTE.accent)
                .setTitle('🛒 Loja do Servidor')
                .setDescription(products.map((p, i) => 
                    `**${i + 1}.** ${p.name} — **${p.price} ${config.currencySymbol}**\n> ${p.description}`
                ).join('\n\n'))
                .setFooter(olympusFooter('Use /loja comprar <nome> para comprar'))
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'comprar') {
            const itemName = interaction.options.getString('item');
            const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const product = await ShopProduct.findOne({ guildId, name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });

            if (!product) return interaction.reply({ content: '❌ Item não encontrado. Use `/loja ver` para ver os itens disponíveis.', flags: 64 });

            const userData = await economyManager.getUser(interaction.user.id, guildId);
            if (userData.balance < product.price) {
                return interaction.reply({ content: `❌ Saldo insuficiente. Preço: **${product.price} ${config.currencySymbol}** | Saldo: **${userData.balance} ${config.currencySymbol}**`, flags: 64 });
            }

            await economyManager.addBalance(interaction.user.id, guildId, -product.price);

            // Adiciona ao inventário
            let userDoc = await UserData.findOne({ userId: interaction.user.id, guildId });
            if (!userDoc) userDoc = await UserData.create({ userId: interaction.user.id, guildId });

            const existingItem = userDoc.inventory?.find(i => i.productName === product.name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                userDoc.inventory.push({ productId: product._id, productName: product.name, quantity: 1 });
            }
            await userDoc.save();

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🛒 Compra Realizada!')
                .setDescription(`Você comprou **${product.name}** por **${product.price} ${config.currencySymbol}**!`)
                .setFooter(olympusFooter('Veja seu inventário com /inventario'))
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    },
};
