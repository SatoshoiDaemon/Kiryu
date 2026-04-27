const { Schema, model } = require('mongoose');

const ruleSchema = new Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    cronExpression: { type: String, required: true },
    action: {
        type: { type: String, enum: ['lock', 'unlock', 'purge', 'send'] },
        targetChannelId: { type: String, required: true },
        payload: { type: String, default: null } // Texto p/ 'send', quantidade p/ 'purge'
    },
    enabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = model('Rule', ruleSchema);
