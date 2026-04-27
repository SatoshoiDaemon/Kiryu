// src/database/models/ModLog.js
const { Schema, model } = require('mongoose');

const modLogSchema = new Schema({
    guildId: { type: String, required: true },
    caseId: { type: Number, required: true }, // ID único da punição no servidor
    userId: { type: String, required: true },
    moderator: { type: String, required: true },
    action: { type: String, required: true },
    reason: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = model('ModLog', modLogSchema);
