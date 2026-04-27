// src/database/models/AIMemory.js
const { Schema, model } = require('mongoose');

const aiMemorySchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = model('AIMemory', aiMemorySchema);
