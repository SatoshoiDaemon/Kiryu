const { Schema, model } = require('mongoose');

const ruleSchema = new Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    trigger: {
        type: { type: String, enum: ['schedule', 'event', 'continuous'], required: true },
        config: { type: Schema.Types.Mixed, required: true } // Flexible config based on type
    },
    conditions: [{
        field: { type: String, enum: ['content', 'channel', 'author', 'time'], required: true },
        operator: { type: String, enum: ['contains', 'equals', 'matches', 'in'], required: true },
        value: { type: String, required: true },
        logic: { type: String, enum: ['AND', 'OR'], default: 'AND' }
    }],
    action: {
        type: { type: String, enum: ['lock', 'unlock', 'purge', 'send', 'react'], required: true },
        targetChannelId: { type: String, required: true },
        payload: { type: String, default: null } // Texto p/ 'send', quantidade p/ 'purge', emoji p/ 'react'
    },
    timezone: { type: String, default: 'America/Sao_Paulo' },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = model('Rule', ruleSchema);
