// src/database/models/CommandPermission.js
const { Schema, model } = require('mongoose');

const commandPermissionSchema = new Schema({
    guildId: { type: String, required: true },
    command: { type: String, required: true },
    type: { type: String, enum: ['role', 'user'], required: true },
    targetId: { type: String, required: true },
});

commandPermissionSchema.index({ guildId: 1, command: 1, type: 1, targetId: 1 }, { unique: true });

module.exports = model('CommandPermission', commandPermissionSchema);
