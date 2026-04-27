// src/utils/managers/xpManager.js
// ============================================================
//   Olympus Community Bot — Gerenciador de XP e Níveis
// ============================================================

const Guild = require('@models/Guild');
const UserData = require('@models/UserData');
const XPRole = require('@models/XPRole');
const logger = require('@utils/logger');

class XPManager {
    /**
     * Retorna a configuração de XP para um servidor.
     * @param {string} guildId
     */
    async getConfig(guildId) {
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            guild = await Guild.create({ guildId });
        }
        return guild.xpConfig;
    }

    /**
     * Calcula o XP necessário para um determinado nível.
     * @param {number} level
     * @returns {number}
     */
    xpForLevel(level) {
        return Math.floor(100 * Math.pow(level, 1.5));
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
        return {
            userId: data.userId,
            guildId: data.guildId,
            xp: data.xp.current,
            level: data.xp.level
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
        const newXP = user.xp + amount;
        let newLevel = user.level;
        let leveledUp = false;

        // Verifica se subiu de nível
        while (newXP >= this.xpForLevel(newLevel + 1)) {
            newLevel++;
            leveledUp = true;
        }

        await UserData.findOneAndUpdate(
            { userId, guildId },
            { $set: { 'xp.current': newXP, 'xp.level': newLevel } },
            { upsert: true, returnDocument: 'after' }
        );

        return { leveledUp, newLevel, xp: newXP };
    }

    /**
     * Define o XP de um usuário diretamente.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} xp
     */
    async setXP(userId, guildId, xp) {
        let level = 0;
        while (xp >= this.xpForLevel(level + 1)) level++;

        await UserData.findOneAndUpdate(
            { userId, guildId },
            { $set: { 'xp.current': xp, 'xp.level': level } },
            { upsert: true, returnDocument: 'after' }
        );
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
            xp: u.xp.current,
            level: u.xp.level
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
