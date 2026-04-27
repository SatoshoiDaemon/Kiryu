// src/utils/managers/economyManager.js
// ============================================================
//   Olympus Community Bot — Gerenciador de Economia
// ============================================================

const Guild = require('@models/Guild');
const UserData = require('@models/UserData');

class EconomyManager {
    /**
     * Retorna a configuração de economia para um servidor.
     * @param {string} guildId
     */
    async getConfig(guildId) {
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            guild = await Guild.create({ guildId });
        }
        return guild.economyConfig;
    }

    /**
     * Obtém os dados de economia de um usuário.
     * @param {string} userId
     * @param {string} guildId
     */
    async getUser(userId, guildId) {
        const data = await this.ensureUser(userId, guildId);
        return {
            userId: data.userId,
            guildId: data.guildId,
            balance: data.economy?.balance || 0,
            bank: data.economy?.bank || 0
        };
    }

    /**
     * Garante que o usuário existe na tabela de economia.
     * @param {string} userId
     * @param {string} guildId
     */
    async ensureUser(userId, guildId) {
        let data = await UserData.findOne({ userId, guildId });
        if (!data) {
            data = await UserData.create({ userId, guildId });
        }
        return data;
    }

    /**
     * Adiciona ou remove saldo da carteira de um usuário.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} amount (pode ser negativo)
     */
    async addBalance(userId, guildId, amount) {
        await this.ensureUser(userId, guildId);
        await UserData.findOneAndUpdate(
            { userId, guildId },
            { $inc: { 'economy.balance': amount } }
        );
        // Garante que o saldo nunca fique negativo
        await UserData.findOneAndUpdate(
            { userId, guildId, 'economy.balance': { $lt: 0 } },
            { $set: { 'economy.balance': 0 } }
        );
    }

    /**
     * Adiciona ou remove saldo do banco de um usuário.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} amount
     */
    async addBank(userId, guildId, amount) {
        await this.ensureUser(userId, guildId);
        await UserData.findOneAndUpdate(
            { userId, guildId },
            { $inc: { 'economy.bank': amount } }
        );
        // Garante que o banco nunca fique negativo
        await UserData.findOneAndUpdate(
            { userId, guildId, 'economy.bank': { $lt: 0 } },
            { $set: { 'economy.bank': 0 } }
        );
    }

    /**
     * Define o saldo diretamente.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} balance
     * @param {number} [bank]
     */
    async setBalance(userId, guildId, balance, bank = undefined) {
        await this.ensureUser(userId, guildId);
        const update = { 'economy.balance': balance };
        if (bank !== undefined) {
            update['economy.bank'] = bank;
        }

        await UserData.findOneAndUpdate({ userId, guildId }, { $set: update });
    }

    /**
     * Obtém o ranking de economia de um servidor.
     * @param {string} guildId
     * @param {number} limit
     */
    async getRanking(guildId, limit = 10) {
        const users = await UserData.aggregate([
            { $match: { guildId } },
            { $addFields: { total: { $add: [{ $ifNull: ['$economy.balance', 0] }, { $ifNull: ['$economy.bank', 0] }] } } },
            { $sort: { total: -1 } },
            { $limit: limit }
        ]);

        return users.map(u => ({
            userId: u.userId,
            guildId: u.guildId,
            balance: u.economy?.balance || 0,
            bank: u.economy?.bank || 0,
            total: u.total
        }));
    }

    /**
     * Verifica e registra o daily de um usuário.
     * @param {string} userId
     * @param {string} guildId
     * @returns {Promise<{ canClaim: boolean, remaining: number, streak: number }>}
     */
    async checkDaily(userId, guildId) {
        const config = await this.getConfig(guildId);
        const user = await this.ensureUser(userId, guildId);
        const now = Date.now();

        const lastDaily = user.economy?.lastDaily || 0;
        const currentStreak = user.economy?.streak || 0;

        if (!lastDaily) {
            return { canClaim: true, remaining: 0, streak: 0 };
        }

        const elapsed = now - lastDaily;
        const cooldown = (config.dailyCooldown || 86400) * 1000;

        if (elapsed >= cooldown) {
            const isStreak = elapsed < cooldown * 2;
            return { canClaim: true, remaining: 0, streak: isStreak ? currentStreak : 0 };
        }

        return { canClaim: false, remaining: cooldown - elapsed, streak: currentStreak };
    }

    /**
     * Registra o daily de um usuário.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} streak
     */
    async claimDaily(userId, guildId, streak) {
        await UserData.findOneAndUpdate(
            { userId, guildId },
            { $set: { 'economy.lastDaily': Date.now(), 'economy.streak': streak + 1 } },
            { upsert: true }
        );
    }
}

module.exports = new EconomyManager();
