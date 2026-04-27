// src/database/models/Guild.js
const { Schema, model } = require('mongoose');

const guildSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    
    branding: {
        botName: { type: String, default: 'Olympus Bot' },
        botAvatar: { type: String, default: null },
        embedColor: { type: String, default: '#1a1a2e' },
        accentColor: { type: String, default: '#7b2fff' },
        updatedAt: { type: Date, default: Date.now },
    },

    aiConfig: {
        apiKey: { type: String, default: null },
        responseChannel: { type: String, default: null },
        mentionOnly: { type: Boolean, default: true },
        keepMemory: { type: Boolean, default: true },
        systemInstruction: { type: String, default: null },
        enabled: { type: Boolean, default: false },
    },

    welcomeConfig: {
        enabled: { type: Boolean, default: false },
        welcomeChannel: { type: String, default: null },
        dmEnabled: { type: Boolean, default: false },
        welcomeMsgDm: { type: String, default: null },
        welcomeMsgChannel: { type: String, default: null },
        initialRoles: { type: [String], default: [] },
    },

    xpConfig: {
        enabled: { type: Boolean, default: true },
        minChatXp: { type: Number, default: 5 },
        maxChatXp: { type: Number, default: 15 },
        voiceXpRate: { type: Number, default: 2 },
        cooldownSeconds: { type: Number, default: 60 },
        notificationChannel: { type: String, default: null },
        levelUpMessage: { type: String, default: 'Parabéns {user}, você subiu para o nível **{level}**!' },
    },

    economyConfig: {
        enabled: { type: Boolean, default: true },
        currencyName: { type: String, default: 'moedas' },
        currencySymbol: { type: String, default: '🪙' },
        dailyAmount: { type: Number, default: 100 },
        dailyCooldown: { type: Number, default: 86400 },
        workMin: { type: Number, default: 50 },
        workMax: { type: Number, default: 200 },
        workCooldown: { type: Number, default: 3600 },
        robEnabled: { type: Boolean, default: true },
        robSuccessRate: { type: Number, default: 0.4 },
        robMinBalance: { type: Number, default: 100 },
    },

    suggestionsConfig: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        autoThread: { type: Boolean, default: true },
    },

    partnershipsConfig: {
        enabled: { type: Boolean, default: false },
        analysisChannel: { type: String, default: null },
        announcementChannel: { type: String, default: null },
        partnerRole: { type: String, default: null },
        staffRole: { type: String, default: null },
        notifyRole: { type: String, default: null },
    },

    instafeedConfig: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        requiredRole: { type: String, default: null },
    },

    starboardConfig: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        minStars: { type: Number, default: 5 },
        emoji: { type: String, default: '⭐' },
    },

    profileConfig: {
        maxBioLength: { type: Number, default: 150 },
        extendedBioRoles: { type: [String], default: [] },
        extendedBioLength: { type: Number, default: 500 },
    },

    antiFakeConfig: {
        enabled: { type: Boolean, default: false },
        minAccountAge: { type: Number, default: 7 },
        kickBots: { type: Boolean, default: false },
        kickUnverifiedBots: { type: Boolean, default: false },
        bannedNicknames: { type: [String], default: [] },
        action: { type: String, default: 'kick' },
        blockNoAvatar: { type: Boolean, default: false },
        blockInviteLinks: { type: Boolean, default: false },
    },

    logsConfig: {
        voiceChannel: { type: String, default: null },
        deleteChannel: { type: String, default: null },
        editChannel: { type: String, default: null },
        inviteChannel: { type: String, default: null },
    },

    modConfig: {
        logChannel: { type: String, default: null },
        antiInvite: { type: Boolean, default: false },
        antiSpam: { type: Boolean, default: false },
        antiMassMention: { type: Boolean, default: false },
        antiEveryone: { type: Boolean, default: false },
        antiLinks: { type: Boolean, default: false },
        antiCaps: { type: Boolean, default: false },
        
        maxUserMentions: { type: Number, default: 5 },
        maxRoleMentions: { type: Number, default: 3 },
        spamThresholdMsgs: { type: Number, default: 5 },
        spamThresholdTime: { type: Number, default: 5000 },
        capsThreshold: { type: Number, default: 70 },
        
        spamAction: { type: String, default: 'delete' },
        inviteAction: { type: String, default: 'delete' },
        mentionAction: { type: String, default: 'delete' },
        
        whitelistUsers: { type: [String], default: [] },
        whitelistRoles: { type: [String], default: [] },
        whitelistChannels: { type: [String], default: [] },
        whitelistWebhooks: { type: [String], default: [] },
        whitelistLinks: { type: [String], default: [] },

        notifyDm: { type: Boolean, default: true },
        hideStaff: { type: Boolean, default: false },
    },

    verificationConfig: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        roleId: { type: String, default: null },
        failAction: { type: String, default: 'none' }, // none, kick, ban
        
        embed: {
            title: { type: String, default: '🛡️ Verificação de Segurança' },
            description: { type: String, default: 'Clique no botão abaixo para iniciar sua verificação e ter acesso aos canais do servidor.' },
            color: { type: String, default: '#7b2fff' },
            image: { type: String, default: null },
        }
    }
}, { timestamps: true });

module.exports = model('Guild', guildSchema);
