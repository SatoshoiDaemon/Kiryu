// src/database/models/Marriage.js
const { Schema, model } = require('mongoose');

const marriageSchema = new Schema({
    user1Id: { type: String, required: true },
    user2Id: { type: String, required: true },
    guildId: { type: String, required: true },
    marriedAt: { type: Date, default: Date.now },
    affinity: { type: Number, default: 100 },
    lastDegradation: { type: Date, default: Date.now },
});

marriageSchema.index({ user1Id: 1, guildId: 1 }, { unique: true });
marriageSchema.index({ user2Id: 1, guildId: 1 }, { unique: true });

module.exports = model('Marriage', marriageSchema);
