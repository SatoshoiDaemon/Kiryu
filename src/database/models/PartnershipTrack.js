// src/database/models/PartnershipTrack.js
// ============================================================
//   Olympus Community Bot — Rastreamento de Parcerias por Staff
// ============================================================

const { Schema, model } = require('mongoose');

const partnershipTrackSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    count: { type: Number, default: 0 },
}, { timestamps: true });

partnershipTrackSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('PartnershipTrack', partnershipTrackSchema);
