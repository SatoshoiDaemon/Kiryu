// src/events/moderation/antiSystem.js
// ============================================================
//   Tengoku Community Bot — Sistema Anti (Moderação Automática)
//   Proteções: spam, invite, mass-mention, everyone, links, caps
// ============================================================

const { EmbedBuilder } = require('discord.js');
const Guild = require('@models/Guild');
const ModLog = require('@models/ModLog');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const logger = require('@utils/logger');

// Cache de mensagens para detecção de spam
const spamCache = new Map(); // userId -> [{ timestamp, channelId }]

// Cache do Guild doc para performance (TTL: 30s)
const guildCache = new Map();
const CACHE_TTL = 30_000;

// Regex para detecção de convites do Discord
const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[\w-]+/i;

// Regex para detecção de links
const LINK_REGEX = /https?:\/\/[^\s]+/i;

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignora bots, DMs e mensagens do sistema
        if (message.author.bot || !message.guild || !message.content) return;

        const guildId = message.guild.id;

        // Cache do Guild doc
        let guildDoc;
        const cached = guildCache.get(guildId);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            guildDoc = cached.doc;
        } else {
            guildDoc = await Guild.findOne({ guildId });
            guildCache.set(guildId, { doc: guildDoc, ts: Date.now() });
        }

        // Sem configuração = sem moderação automática
        if (!guildDoc || !guildDoc.modConfig) return;
        
        const cfg = guildDoc.modConfig;

        // Garante que message.member está disponível (pode ser null se não cacheado)
        if (!message.member) {
            try {
                await message.guild.members.fetch(message.author.id);
            } catch {
                return; // Não conseguiu buscar o membro, ignora
            }
        }

        // Verifica se o autor está na whitelist
        if (isWhitelisted(message, cfg)) return;

        // Executa as verificações em ordem de prioridade
        const checks = [
            cfg.antiSpam         && checkSpam(message, cfg, client),
            cfg.antiInvite       && checkInvite(message, cfg, client, guildDoc),
            cfg.antiMassMention && checkMassMention(message, cfg, client),
            cfg.antiEveryone     && checkEveryone(message, cfg, client),
            cfg.antiLinks        && checkLinks(message, cfg, client),
            cfg.antiCaps         && checkCaps(message, cfg, client),
        ].filter(Boolean);

        // Executa todas as verificações (a primeira que retornar true interrompe)
        for (const check of checks) {
            const triggered = await check;
            if (triggered) break;
        }
    },
};

// ═══════════════════════════════════════════════════════════════
//   VERIFICAÇÃO DE WHITELIST
// ═══════════════════════════════════════════════════════════════
function isWhitelisted(message, cfg) {
    // 1. Bypass para Staff (Administradores e Moderadores)
    if (message.member.permissions.has('ManageMessages') || message.member.permissions.has('Administrator')) {
        return true;
    }

    const wlUsers    = cfg.whitelistUsers || [];
    const wlRoles    = cfg.whitelistRoles || [];
    const wlChannels = cfg.whitelistChannels || [];

    // Usuário na whitelist
    if (wlUsers.includes(message.author.id)) return true;

    // Canal na whitelist
    if (wlChannels.includes(message.channel.id)) return true;

    // Cargo na whitelist
    const memberRoles = [...message.member.roles.cache.keys()];
    if (wlRoles.some(r => memberRoles.includes(r))) return true;

    // Webhook na whitelist
    if (message.webhookId) {
        const wlWebhooks = cfg.whitelistWebhooks || [];
        if (wlWebhooks.includes(message.webhookId)) return true;
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
//   ANTI-SPAM
// ═══════════════════════════════════════════════════════════════
async function checkSpam(message, cfg, client) {
    const userId    = message.author.id;
    const now       = Date.now();
    const threshold = cfg.spamThresholdMsgs || 5;
    const window    = cfg.spamThresholdTime || 5000;

    // Inicializa ou atualiza o cache
    if (!spamCache.has(userId)) {
        spamCache.set(userId, []);
    }

    const userMsgs = spamCache.get(userId);
    userMsgs.push({ timestamp: now, channelId: message.channel.id });

    // Remove mensagens fora da janela de tempo
    const recent = userMsgs.filter(m => now - m.timestamp < window);
    spamCache.set(userId, recent);

    // Limpa o cache periodicamente
    if (spamCache.size > 1000) {
        for (const [key, msgs] of spamCache.entries()) {
            if (msgs.every(m => now - m.timestamp > window * 2)) {
                spamCache.delete(key);
            }
        }
    }

    if (recent.length >= threshold) {
        spamCache.delete(userId); // Reset após detecção
        return await applyAction(message, cfg.spamAction || 'delete', 'spam', client,
            `Você enviou ${threshold} mensagens em menos de ${window}ms.`, cfg);
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
//   ANTI-INVITE
// ═══════════════════════════════════════════════════════════════
async function checkInvite(message, cfg, client, guildDoc) {
    if (!INVITE_REGEX.test(message.content)) return false;

    // Não bloquear convites nos canais de parcerias
    const partCfg = guildDoc?.partnershipsConfig;
    if (partCfg) {
        const partnerChannels = [partCfg.analysisChannel, partCfg.announcementChannel].filter(Boolean);
        if (partnerChannels.includes(message.channel.id)) return false;
    }

    return await applyAction(message, cfg.inviteAction || 'delete', 'invite', client,
        'Convites de outros servidores não são permitidos aqui.', cfg);
}

// ═══════════════════════════════════════════════════════════════
//   ANTI-MENÇÃO EM MASSA
// ═══════════════════════════════════════════════════════════════
async function checkMassMention(message, cfg, client) {
    const maxUsers = cfg.maxUserMentions || 5;
    const maxRoles = cfg.maxRoleMentions || 3;

    const userMentions = message.mentions.users.size;
    const roleMentions = message.mentions.roles.size;

    if (userMentions > maxUsers) {
        return await applyAction(message, cfg.mentionAction || 'delete', 'mass-mention', client,
            `Você excedeu o limite de ${maxUsers} menções de usuário por mensagem.`, cfg);
    }

    if (roleMentions > maxRoles) {
        return await applyAction(message, cfg.mentionAction || 'delete', 'mass-mention', client,
            `Você excedeu o limite de ${maxRoles} menções de cargo por mensagem.`, cfg);
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
//   ANTI-EVERYONE/HERE
// ═══════════════════════════════════════════════════════════════
async function checkEveryone(message, cfg, client) {
    // Usa message.mentions.everyone que detecta mesmo sem permissão efetiva
    const hasEveryoneMention = message.mentions.everyone || 
        message.content.includes('@everyone') || 
        message.content.includes('@here');
    
    if (!hasEveryoneMention) return false;
    if (message.member.permissions.has('MentionEveryone')) return false;

    return await applyAction(message, 'delete', 'everyone', client,
        'Menções globais (@everyone/@here) não são permitidas.', cfg);
}

// ═══════════════════════════════════════════════════════════════
//   ANTI-LINKS
// ═══════════════════════════════════════════════════════════════
async function checkLinks(message, cfg, client) {
    if (!LINK_REGEX.test(message.content)) return false;

    // Verifica se o link está na whitelist
    if (cfg.whitelistLinks) {
        const allowed = cfg.whitelistLinks || [];
        if (allowed.some(domain => message.content.includes(domain))) return false;
    }

    return await applyAction(message, cfg.inviteAction || 'delete', 'link', client,
        'Links externos não são permitidos neste canal.', cfg);
}

// ═══════════════════════════════════════════════════════════════
//   ANTI-CAPS
// ═══════════════════════════════════════════════════════════════
async function checkCaps(message, cfg, client) {
    const content = message.content.replace(/[^a-zA-Z]/g, '');
    if (content.length < 8) return false; // Ignora mensagens muito curtas

    const threshold = cfg.capsThreshold || 70;
    const upperCount = content.split('').filter(c => c === c.toUpperCase()).length;
    const percentage = (upperCount / content.length) * 100;

    if (percentage >= threshold) {
        return await applyAction(message, 'delete', 'caps', client,
            `Mensagens com mais de ${threshold}% de letras maiúsculas não são permitidas.`, cfg);
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════
//   APLICAR AÇÃO
// ═══════════════════════════════════════════════════════════════
async function applyAction(message, action, type, client, reason, cfg) {
    try {
        // Sempre deleta a mensagem
        await message.delete().catch(() => null);

        // Notifica o usuário no canal (efêmero simulado com delete)
        const notifyEmbed = new EmbedBuilder()
            .setColor(PALETTE.warning)
            .setTitle('🛡️ Ação de Moderação Automática')
            .setDescription(`${message.author}, sua mensagem foi removida.\n\n**Motivo:** ${reason}`)
            .setFooter(tengokuFooter())
            .setTimestamp();

        const notify = await message.channel.send({ embeds: [notifyEmbed] }).catch(() => null);
        if (notify) setTimeout(() => notify.delete().catch(() => null), 8000);

        // Notifica o usuário via DM se habilitado
        if (cfg.notifyDm) {
            const dmEmbed = new EmbedBuilder()
                .setColor(PALETTE.error)
                .setTitle(`🚨 Notificação de Punição — ${message.guild.name}`)
                .setDescription(`Sua mensagem foi removida pela moderação automática.\n\n**Infração:** ${type}\n**Motivo:** ${reason}`)
                .setFooter(tengokuFooter('Comportamento inadequado pode levar a banimento'))
                .setTimestamp();
            
            await message.author.send({ embeds: [dmEmbed] }).catch(() => null);
        }

        // Aplica ação adicional conforme configurado
        if (action === 'warn') {
            await logModAction(message, type, reason, 'warn', client, cfg);
            await handleEscalation(message, client);
        } else if (action === 'mute') {
            await muteMember(message.member, reason, client);
            await logModAction(message, type, reason, 'mute', client, cfg);
        } else if (action === 'kick') {
            await kickMember(message.member, reason, client);
            await logModAction(message, type, reason, 'kick', client, cfg);
        } else if (action === 'ban') {
            await banMember(message.member, reason, client);
            await logModAction(message, type, reason, 'ban', client, cfg);
        } else {
            // Apenas deletar (padrão)
            await logModAction(message, type, reason, 'delete', client, cfg);
        }

        return true;
    } catch (err) {
        logger.error(`Erro ao aplicar ação de moderação (${type}): ${err.message}`);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
//   SISTEMA DE ESCALONAMENTO
// ═══════════════════════════════════════════════════════════════
async function handleEscalation(message, client) {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Conta quantas infrações de 'warn' o usuário teve nas últimas 24h
        const warnCount = await ModLog.countDocuments({
            guildId: message.guild.id,
            userId: message.author.id,
            action: { $regex: /warn/i },
            createdAt: { $gte: twentyFourHoursAgo }
        });

        // Se atingiu 3 warns nas últimas 24h, aplica Mute de 10 minutos
        if (warnCount >= 3) {
            const muteReason = '[Auto-Moderação] Escalonamento: O usuário atingiu 3 advertências automáticas nas últimas 24 horas.';
            await muteMember(message.member, muteReason, client);
            await logModAction(message, 'escalation', muteReason, 'mute', client);
            
            const escalateEmbed = new EmbedBuilder()
                .setColor(PALETTE.error)
                .setTitle('🔇 Silenciamento Automático')
                .setDescription(`${message.author} foi silenciado por 10 minutos por excesso de infrações.`)
                .setFooter(tengokuFooter())
                .setTimestamp();
                
            await message.channel.send({ embeds: [escalateEmbed] }).catch(() => null);
        }
    } catch (err) {
        logger.error(`Erro no sistema de escalonamento: ${err.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//   AÇÕES DE MODERAÇÃO
// ═══════════════════════════════════════════════════════════════
async function muteMember(member, reason, client) {
    try {
        // Timeout de 10 minutos
        await member.timeout(600000, reason);
    } catch (err) {
        logger.warn(`Não foi possível aplicar timeout em ${member.user.tag}: ${err.message}`);
    }
}

async function kickMember(member, reason, client) {
    try {
        await member.kick(reason);
    } catch (err) {
        logger.warn(`Não foi possível expulsar ${member.user.tag}: ${err.message}`);
    }
}

async function banMember(member, reason, client) {
    try {
        await member.ban({ reason, deleteMessageSeconds: 86400 });
    } catch (err) {
        logger.warn(`Não foi possível banir ${member.user.tag}: ${err.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//   LOG DE AÇÕES
// ═══════════════════════════════════════════════════════════════
async function logModAction(message, type, reason, action, client, cfg) {
    try {
        const guildId = message.guild.id;
        // 'log' does not perform any action on the member, it only falls through to the ModLog registration below
        const { registerModLog } = require('@utils/helpers/modHelper');
        const log = await registerModLog(guildId, message.author.id, client.user.id, `auto-${type}`, reason);
        const caseId = log ? log.caseId : '?';

        // Envia para o canal de logs configurado
        if (!cfg?.logChannel) return;

        const logChannel = message.guild.channels.cache.get(cfg.logChannel);
        if (!logChannel) return;

        const actionLabels = {
            'delete': '🗑️ Mensagem Deletada',
            'warn':   '⚠️ Aviso Emitido',
            'mute':   '🔇 Timeout Aplicado (10min)',
            'kick':   '👢 Usuário Expulso',
            'ban':    '🔨 Usuário Banido',
        };

        const typeLabels = {
            'spam':         '💬 Anti-Spam',
            'invite':       '🔗 Anti-Invite',
            'mass-mention': '📢 Anti-Menção em Massa',
            'everyone':     '📣 Anti-Everyone',
            'link':         '🌐 Anti-Links',
            'caps':         '🔠 Anti-Caps',
            'escalation':   '📈 Escalonamento'
        };

        const embed = new EmbedBuilder()
            .setColor(PALETTE.warning)
            .setTitle(`${typeLabels[type] || type} — ${actionLabels[action] || action} | Caso #${caseId}`)
            .addFields(
                { name: 'Usuário', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                { name: 'Motivo', value: reason, inline: false },
                { name: 'Conteúdo', value: message.content ? `\`\`\`${message.content.substring(0, 500)}\`\`\`` : '`(sem conteúdo)`', inline: false },
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter(tengokuFooter(`ID: ${message.author.id}`))
            .setTimestamp();

        if (!cfg.hideStaff) {
            embed.addFields({ name: 'Responsável', value: `${client.user.tag} (Automod)`, inline: true });
        } else {
            embed.addFields({ name: 'Responsável', value: '🛡️ Moderação Automática', inline: true });
        }

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        logger.error(`Erro ao registrar log de moderação: ${err.message}`);
    }
}
