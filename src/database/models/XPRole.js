// src/database/models/XPRole.js
const { Schema, model } = require('mongoose');

const xpRoleSchema = new Schema({
    guildId: { type: String, required: true },
    level: { type: Number, required: true },
    roleId: { type: String, required: true },
});

xpRoleSchema.index({ guildId: 1, level: 1 }, { unique: true });

module.exports = model('XPRole', xpRoleSchema);
