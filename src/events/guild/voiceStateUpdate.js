// src/events/guild/voiceStateUpdate.js
// ============================================================
//   Olympus Community Bot — Rastreamento de Tempo em Call
// ============================================================

const UserData = require('@models/UserData');

// Map para rastrear quando o usuário entrou no canal de voz
const voiceJoins = new Map(); // `guildId:userId` -> timestamp

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const guildId = (newState.guild || oldState.guild).id;
        const userId = member.user.id;
        const key = `${guildId}:${userId}`;

        // Entrou em canal de voz
        if (!oldState.channelId && newState.channelId) {
            voiceJoins.set(key, Date.now());
            return;
        }

        // Saiu de canal de voz
        if (oldState.channelId && !newState.channelId) {
            const joinedAt = voiceJoins.get(key);
            voiceJoins.delete(key);
            if (!joinedAt) return;

            const minutesSpent = Math.floor((Date.now() - joinedAt) / 60000);
            if (minutesSpent < 1) return;

            await UserData.findOneAndUpdate(
                { userId, guildId },
                { $inc: { 'stats.voiceMinutes': minutesSpent } },
                { upsert: true }
            );
            return;
        }

        // Mudou de canal (continua a sessão, não faz nada)
    },
};
