const { Schema, model } = require('mongoose');

const ticketTranscriptSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true },
    transcriptUrl: { type: String, default: null },
    transcriptMessageId: { type: String, default: null },
    filename: { type: String, default: null },
}, { timestamps: true });

ticketTranscriptSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });
module.exports = model('TicketTranscript', ticketTranscriptSchema);
