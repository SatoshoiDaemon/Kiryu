// src/utils/managers/xpManager.js
// ============================================================
//   Tengoku Community Bot — Gerenciador de XP e Níveis
// ============================================================

const Guild = require('@models/Guild');
const UserData = require('@models/UserData');
const XPRole = require('@models/XPRole');
const logger = require('@utils/logger');

class XPManager {
    sanitizeAmount(value, fallback = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(0, Math.floor(number));
    }

    normalizeConfig(config = {}) {
        const minChatXp = this.sanitizeAmount(config.minChatXp, 5);
        const maxChatXp = Math.max(minChatXp, this.sanitizeAmount(config.maxChatXp, 15));

        return {
            ...config,
            enabled: config.enabled !== false,
            minChatXp,
            maxChatXp,
            voiceXpRate: this.sanitizeAmount(config.voiceXpRate, 2),
            cooldownSeconds: this.sanitizeAmount(config.cooldownSeconds, 60),
            notificationChannel: config.notificationChannel || null,
            levelUpMessage: config.levelUpMessage || 'Parabéns {user}, você subiu para o nível **{level}**!',
        };
    }

    /**
     * Retorna a configuração de XP para um servidor.
     * @param {string} guildId
     */
    async getConfig(guildId) {
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            guild = await Guild.create({ guildId });
        }
        return this.normalizeConfig(guild.xpConfig);
    }

    /**
     * Calcula o XP necessário para um determinado nível.
     * @param {number} level
     * @returns {number}
     */
    xpForLevel(level) {
        const safeLevel = this.sanitizeAmount(level);
        if (safeLevel <= 0) return 0;
        return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(100 * Math.pow(safeLevel, 1.5)));
    }

    /**
     * Calcula o nível correspondente ao XP total acumulado.
     * @param {number} xp
     * @returns {number}
     */
    levelFromXP(xp) {
        const safeXP = this.sanitizeAmount(xp);
        if (safeXP <= 0) return 0;

        let low = 0;
        let high = 1;

        while (this.xpForLevel(high) <= safeXP && high < 1000000) {
            high *= 2;
        }

        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            if (this.xpForLevel(mid) <= safeXP) low = mid;
            else high = mid - 1;
        }

        return low;
    }

    /**
     * Garante que XP e nível estejam coerentes.
     * @param {number} xp
     * @returns {{ xp: number, level: number }}
     */
    normalizeXP(xp) {
        const safeXP = this.sanitizeAmount(xp);
        return {
            xp: safeXP,
            level: this.levelFromXP(safeXP),
        };
    }

    /**
     * Normaliza um registro já salvo e repara o padrão legado de /gerenciar nível
     * que gravava level * level * 100 em vez da curva oficial.
     * @param {number} xp
     * @param {number} level
     * @returns {{ xp: number, level: number, repaired: boolean }}
     */
    normalizeUserState(xp, level) {
        const safeXP = this.sanitizeAmount(xp);
        const safeLevel = this.sanitizeAmount(level);

        if (safeLevel > 0) {
            const minXP = this.xpForLevel(safeLevel);
            const nextXP = this.xpForLevel(safeLevel + 1);
            const legacySetLevelXP = safeLevel * safeLevel * 100;
            if (safeXP >= nextXP && safeXP === legacySetLevelXP) {
                return { xp: minXP, level: safeLevel, repaired: true };
            }
        }

        const normalized = this.normalizeXP(safeXP);
        return { ...normalized, repaired: normalized.level !== safeLevel };
    }

    /**
     * Retorna os dados seguros para exibir progresso no nível atual.
     * @param {number} xp
     * @param {number} level
     */
    getProgress(xp, level = null) {
        const safeXP = this.sanitizeAmount(xp);
        const safeLevel = level === null ? this.levelFromXP(safeXP) : this.sanitizeAmount(level);
        const currentLevelXP = this.xpForLevel(safeLevel);
        const nextLevelXP = this.xpForLevel(safeLevel + 1);
        const required = Math.max(1, nextLevelXP - currentLevelXP);
        const current = Math.min(required, Math.max(0, safeXP - currentLevelXP));
        const percent = Math.min(100, Math.max(0, Math.floor((current / required) * 100)));

        return {
            level: safeLevel,
            xp: safeXP,
            current,
            required,
            currentLevelXP,
            nextLevelXP,
            percent,
        };
    }

    /**
     * Obtém os dados de XP de um usuário.
     * @param {string} userId
     * @param {string} guildId
     */
    async getUser(userId, guildId) {
        let data = await UserData.findOne({ userId, guildId });
        if (!data) {
            data = await UserData.create({ userId, guildId });
        }
        const normalized = this.normalizeUserState(data.xp?.current, data.xp?.level);
        if (normalized.repaired) {
            await UserData.findOneAndUpdate(
                { userId, guildId },
                { $set: { 'xp.current': normalized.xp, 'xp.level': normalized.level } },
                { upsert: true }
            );
        }

        return {
            userId: data.userId,
            guildId: data.guildId,
            xp: normalized.xp,
            level: normalized.level,
            repaired: normalized.repaired,
        };
    }

    /**
     * Adiciona XP a um usuário. Retorna { leveledUp, newLevel } se subiu de nível.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} amount
     * @returns {{ leveledUp: boolean, newLevel: number, xp: number }}
     */
    async addXP(userId, guildId, amount) {
        const user = await this.getUser(userId, guildId);
        const previous = this.normalizeXP(user.xp);
        const normalized = this.normalizeXP(previous.xp + this.sanitizeAmount(amount));
        const leveledUp = normalized.level > previous.level;

        const updated = await UserData.findOneAndUpdate(
            { userId, guildId },
            { $set: { 'xp.current': normalized.xp, 'xp.level': normalized.level } },
            { upsert: true, returnDocument: 'after' }
        );

        return {
            leveledUp,
            oldLevel: previous.level,
            newLevel: updated.xp.level,
            xp: updated.xp.current,
        };
    }

    /**
     * Define o XP de um usuário diretamente.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} xp
     */
    async setXP(userId, guildId, xp) {
        const normalized = this.normalizeXP(xp);

        const updated = await UserData.findOneAndUpdate(
            { userId, guildId },
            { $set: { 'xp.current': normalized.xp, 'xp.level': normalized.level } },
            { upsert: true, returnDocument: 'after' }
        );

        return {
            xp: updated.xp.current,
            level: updated.xp.level,
        };
    }

    /**
     * Define o nível de um usuário diretamente usando a curva oficial.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} level
     */
    async setLevel(userId, guildId, level) {
        return this.setXP(userId, guildId, this.xpForLevel(level));
    }

    /**
     * Remove XP sem permitir saldo negativo.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} amount
     */
    async removeXP(userId, guildId, amount) {
        const user = await this.getUser(userId, guildId);
        return this.setXP(userId, guildId, Math.max(0, user.xp - this.sanitizeAmount(amount)));
    }

    /**
     * Obtém o ranking de XP de um servidor.
     * @param {string} guildId
     * @param {number} limit
     */
    async getRanking(guildId, limit = 10) {
        const users = await UserData.find({ guildId })
            .sort({ 'xp.current': -1 })
            .limit(limit);

        return users.map(u => ({
            userId: u.userId,
            guildId: u.guildId,
            ...this.normalizeUserState(u.xp?.current, u.xp?.level)
        }));
    }

    /**
     * Obtém o cargo de recompensa para um nível.
     * @param {string} guildId
     * @param {number} level
     */
    async getRoleForLevel(guildId, level) {
        const xpRole = await XPRole.findOne({ guildId, level: { $lte: level } })
            .sort({ level: -1 });
        
        return xpRole ? { roleId: xpRole.roleId } : null;
    }

    /**
     * Atualiza o cargo de um membro com base no seu nível atual.
     * @param {GuildMember} member
     */
    async updateMemberRole(member) {
        try {
            const user = await this.getUser(member.id, member.guild.id);
            const roleData = await this.getRoleForLevel(member.guild.id, user.level);
            if (!roleData) return;

            const role = member.guild.roles.cache.get(roleData.roleId);
            if (role && !member.roles.cache.has(role.id)) {
                await member.roles.add(role);
            }
        } catch (err) {
            logger.error(`Erro ao atualizar cargo de XP: ${err.message}`);
        }
    }
}

module.exports = new XPManager();
