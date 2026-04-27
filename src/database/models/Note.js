// src/database/models/Note.js
// ============================================================
//   Tengoku Community Bot — Notas de Moderação
// ============================================================

const { Schema, model } = require('mongoose');

const noteSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderator: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

noteSchema.index({ guildId: 1, userId: 1 });

module.exports = model('Note', noteSchema);
