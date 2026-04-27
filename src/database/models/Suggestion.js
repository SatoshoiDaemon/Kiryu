// src/database/models/Suggestion.js
const { Schema, model } = require('mongoose');

const suggestionSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    content: { type: String, required: true },
    messageId: { type: String, default: null },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = model('Suggestion', suggestionSchema);
