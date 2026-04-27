// src/database/models/UserData.js
const { Schema, model } = require('mongoose');

// Representa os dados de um usuário especificamente em um servidor
const userDataSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    
    xp: {
        current: { type: Number, default: 0 },
        level: { type: Number, default: 0 }
    },

    economy: {
        balance: { type: Number, default: 0 },
        bank: { type: Number, default: 0 },
        lastDaily: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        lastWork: { type: Number, default: 0 }
    },

    inventory: [{
        productId: { type: Schema.Types.ObjectId, ref: 'ShopProduct' },
        productName: { type: String },
        quantity: { type: Number, default: 1 },
        purchasedAt: { type: Date, default: Date.now }
    }],

    profile: {
        bio: { type: String, default: 'No bio yet.' },
        thumbnail: { type: String, default: null },
        image: { type: String, default: null }
    },

    stats: {
        messages: { type: Number, default: 0 },
        voiceMinutes: { type: Number, default: 0 },
        invites: { type: Number, default: 0 }
    },

    afkData: {
        isAfk: { type: Boolean, default: false },
        reason: { type: String, default: '' },
        since: { type: Date }
    }
}, { timestamps: true });

// Garantir que a combinação de userId e guildId seja única
userDataSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = model('UserData', userDataSchema);
