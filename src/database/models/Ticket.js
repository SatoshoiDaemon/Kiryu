const { Schema, model } = require('mongoose');

const ticketAnswerSchema = new Schema({
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
    required: { type: Boolean, default: true },
}, { _id: false });

const ticketSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, unique: true },
    ticketNumber: { type: Number, default: null },
    panelId: { type: String, required: true },
    optionId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed', 'deleted'], default: 'open' },
    claimedById: { type: String, default: null },
    staffRoleIds: { type: [String], default: [] },
    formAnswers: { type: [ticketAnswerSchema], default: [] },
    closeReason: { type: String, default: null },
    closedById: { type: String, default: null },
    closedAt: { type: Date, default: null },
    reopenedById: { type: String, default: null },
    reopenedAt: { type: Date, default: null },
    deletedById: { type: String, default: null },
    deletedAt: { type: Date, default: null },
    transcriptUrl: { type: String, default: null },
    transcriptMessageId: { type: String, default: null },
    ticketMessageId: { type: String, default: null },
}, { timestamps: true });

ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: false, sparse: true });
module.exports = model('Ticket', ticketSchema);
