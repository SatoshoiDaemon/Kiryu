// src/database/models/Shop.js
const { Schema, model } = require('mongoose');

const shopProductSchema = new Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, default: 'digital' },
    productData: { type: String, default: null },
    showInInventory: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

const shopOrderSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'ShopProduct', required: true },
    productName: { type: String, required: true },
    price: { type: Number, required: true },
    purchasedAt: { type: Date, default: Date.now },
});

module.exports = {
    ShopProduct: model('ShopProduct', shopProductSchema),
    ShopOrder: model('ShopOrder', shopOrderSchema)
};
