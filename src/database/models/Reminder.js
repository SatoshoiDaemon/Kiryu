// src/database/models/Reminder.js
const { Schema, model } = require('mongoose');

const reminderSchema = new Schema({
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    reason: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = model('Reminder', reminderSchema);
