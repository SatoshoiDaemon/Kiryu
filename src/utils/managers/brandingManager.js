// src/utils/managers/brandingManager.js
// ============================================================
//   Olympus Community Bot — Gerenciador de Branding por Servidor
// ============================================================

const Guild = require('@models/Guild');

const DEFAULTS = {
    botName:     'Olympus Bot',
    botAvatar:   null,
    embedColor:  '#1a1a2e',
    accentColor: '#7b2fff',
};

class BrandingManager {
    /**
     * Obtém o branding configurado para um servidor.
     * @param {string} guildId
     * @returns {Promise<{ name: string, avatar: string|null, color: string, accent: string }>}
     */
    async get(guildId) {
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            guild = await Guild.create({ guildId });
        }
        
        const branding = guild.branding || {};
        
        return {
            name:   branding.botName     || DEFAULTS.botName,
            avatar: branding.botAvatar   || DEFAULTS.botAvatar,
            color:  branding.embedColor  || DEFAULTS.embedColor,
            accent: branding.accentColor || DEFAULTS.accentColor,
        };
    }

    /**
     * Atualiza o branding de um servidor.
     * @param {string} guildId
     * @param {Object} data (expects snake_case keys like bot_name to map to camelCase botName)
     */
    async set(guildId, data) {
        const update = {};
        
        // Aceita tanto camelCase (do configHandler) quanto snake_case
        if (data.botName !== undefined || data.bot_name !== undefined)       update['branding.botName'] = data.botName ?? data.bot_name;
        if (data.botAvatar !== undefined || data.bot_avatar !== undefined)   update['branding.botAvatar'] = data.botAvatar ?? data.bot_avatar;
        if (data.embedColor !== undefined || data.embed_color !== undefined) update['branding.embedColor'] = data.embedColor ?? data.embed_color;
        if (data.accentColor !== undefined || data.accent_color !== undefined) update['branding.accentColor'] = data.accentColor ?? data.accent_color;

        if (Object.keys(update).length === 0) return;

        update['branding.updatedAt'] = new Date();

        await Guild.findOneAndUpdate(
            { guildId },
            { $set: update },
            { upsert: true }
        );
    }
}

module.exports = new BrandingManager();
