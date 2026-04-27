// src/events/guild/inviteTracker.js
// ============================================================
//   Tengoku Community Bot — Rastreamento de Invites
// ============================================================

const UserData = require('@models/UserData');
const logger = require('@utils/logger');

// Cache de invites por servidor
const inviteCache = new Map(); // guildId -> Map(code -> uses)

module.exports = [
    // Cachear invites quando o bot se conecta
    {
        name: 'clientReady',
        once: true,
        async execute(client) {
            for (const guild of client.guilds.cache.values()) {
                try {
                    const invites = await guild.invites.fetch();
                    inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
                } catch {
                    // Sem permissão para gerenciar invites
                }
            }
            logger.info(`📨 Invite tracker carregado para ${inviteCache.size} servidor(es).`);
        }
    },

    // Atualizar cache quando um invite é criado
    {
        name: 'inviteCreate',
        async execute(invite) {
            if (!invite.guild) return;
            const guildInvites = inviteCache.get(invite.guild.id) || new Map();
            guildInvites.set(invite.code, invite.uses || 0);
            inviteCache.set(invite.guild.id, guildInvites);
        }
    },

    // Atualizar cache quando um invite é deletado
    {
        name: 'inviteDelete',
        async execute(invite) {
            if (!invite.guild) return;
            const guildInvites = inviteCache.get(invite.guild.id);
            if (guildInvites) guildInvites.delete(invite.code);
        }
    },

    // Detectar quem convidou ao entrar no servidor
    {
        name: 'guildMemberAdd',
        async execute(member) {
            if (member.user.bot) return;

            try {
                const guildId = member.guild.id;
                const oldInvites = inviteCache.get(guildId) || new Map();
                const newInvites = await member.guild.invites.fetch();

                // Encontrar o invite que teve usos incrementados
                const usedInvite = newInvites.find(inv => {
                    const oldUses = oldInvites.get(inv.code) || 0;
                    return inv.uses > oldUses;
                });

                // Atualizar cache
                inviteCache.set(guildId, new Map(newInvites.map(i => [i.code, i.uses])));

                if (usedInvite && usedInvite.inviter) {
                    // Incrementar stats.invites do convidador
                    await UserData.findOneAndUpdate(
                        { userId: usedInvite.inviter.id, guildId },
                        { $inc: { 'stats.invites': 1 } },
                        { upsert: true }
                    );
                }
            } catch {
                // Sem permissão ou erro
            }
        }
    },
];
