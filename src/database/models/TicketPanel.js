const { Schema, model } = require('mongoose');

const ticketFormFieldSchema = new Schema({
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    placeholder: { type: String, default: null },
    type: { type: String, enum: ['short', 'paragraph'], required: true },
    required: { type: Boolean, default: true },
    minLength: { type: Number, default: null },
    maxLength: { type: Number, default: null },
}, { _id: false });

const ticketOptionSchema = new Schema({
    optionId: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: null },
    emoji: { type: String, default: null },
    style: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Primary' },
    ticketNameFormat: { type: String, default: 'ticket-{username}-{ticket.id}' },
    channelTopicFormat: { type: String, default: null },
    form: { type: [ticketFormFieldSchema], default: [] },
    staffRoleIds: { type: [String], default: [] },
    categoryId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    transcriptChannelId: { type: String, default: null },
    welcomeMessage: {
        content: { type: String, default: null },
        embed: { type: Schema.Types.Mixed, default: null },
    },
}, { _id: false });

const ticketPanelSchema = new Schema({
    guildId: { type: String, required: true, index: true },
    panelId: { type: String, required: true },
    name: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null },
    embed: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        color: { type: String, default: null },
        image: { type: String, default: null },
        thumbnail: { type: String, default: null },
        footer: { type: String, default: null },
    },
    mode: { type: String, enum: ['buttons', 'select'], default: 'buttons' },
    options: { type: [ticketOptionSchema], default: [] },
    staffRoleIds: { type: [String], default: [] },
    logChannelId: { type: String, default: null },
    transcriptChannelId: { type: String, default: null },
    ticketCategoryId: { type: String, default: null },
    closedTicketCategoryId: { type: String, default: null },
    maxOpenTicketsPerUser: { type: Number, default: 1 },
}, { timestamps: true });

ticketPanelSchema.index({ guildId: 1, panelId: 1 }, { unique: true });
module.exports = model('TicketPanel', ticketPanelSchema);
