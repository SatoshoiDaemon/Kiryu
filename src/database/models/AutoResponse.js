const { Schema, model } = require('mongoose');

const autoResponseSchema = new Schema({
    guildId: { type: String, required: true },
    trigger: { type: String, required: true },
    responses: { type: [String], default: [] },
    matchType: { type: String, enum: ['exact', 'contains'], default: 'contains' },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = model('AutoResponse', autoResponseSchema);
