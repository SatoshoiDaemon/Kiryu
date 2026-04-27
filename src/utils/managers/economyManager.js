// src/utils/managers/economyManager.js
// ============================================================
//   Tengoku Community Bot — Gerenciador de Economia
// ============================================================

const Guild = require('@models/Guild');
const UserData = require('@models/UserData');

class EconomyManager {
    sanitizeAmount(value, fallback = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(0, Math.floor(number));
    }

    sanitizeSignedAmount(value, fallback = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.trunc(number);
    }

    normalizeConfig(config = {}) {
        return {
            ...config,
            currencyName: String(config.currencyName || 'moedas').trim() || 'moedas',
            currencySymbol: String(config.currencySymbol || '🪙').trim() || '🪙',
            dailyAmount: this.sanitizeAmount(config.dailyAmount, 100),
            dailyCooldown: this.sanitizeAmount(config.dailyCooldown, 86400),
            workMin: this.sanitizeAmount(config.workMin, 50),
            workMax: this.sanitizeAmount(config.workMax, 200),
            workCooldown: this.sanitizeAmount(config.workCooldown, 3600),
            robMinBalance: this.sanitizeAmount(config.robMinBalance, 100),
        };
    }

    formatCurrency(amount, config = {}, options = {}) {
        const normalized = this.normalizeConfig(config);
        const value = this.sanitizeAmount(amount).toLocaleString('pt-BR');
        const symbol = normalized.currencySymbol;

        if (options.withName) {
            return `${value} ${symbol} ${normalized.currencyName}`;
        }

        return `${value} ${symbol}`;
    }

    /**
     * Retorna a configuração de economia para um servidor.
     * @param {string} guildId
     */
    async getConfig(guildId) {
        let guild = await Guild.findOne({ guildId });
        if (!guild) {
            guild = await Guild.create({ guildId });
        }
        return this.normalizeConfig(guild.economyConfig);
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
            balance: this.sanitizeAmount(data.economy?.balance),
            bank: this.sanitizeAmount(data.economy?.bank)
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
        const delta = this.sanitizeSignedAmount(amount);

        const updated = await UserData.findOneAndUpdate(
            { userId, guildId },
            [
                {
                    $set: {
                        userId,
                        guildId,
                        'economy.balance': {
                            $max: [0, { $add: [{ $ifNull: ['$economy.balance', 0] }, delta] }]
                        }
                    }
                }
            ],
            { upsert: true, returnDocument: 'after' }
        );

        return {
            balance: this.sanitizeAmount(updated.economy?.balance),
            bank: this.sanitizeAmount(updated.economy?.bank),
        };
    }

    /**
     * Adiciona ou remove saldo do banco de um usuário.
     * @param {string} userId
     * @param {string} guildId
     * @param {number} amount
     */
    async addBank(userId, guildId, amount) {
        const delta = this.sanitizeSignedAmount(amount);

        const updated = await UserData.findOneAndUpdate(
            { userId, guildId },
            [
                {
                    $set: {
                        userId,
                        guildId,
                        'economy.bank': {
                            $max: [0, { $add: [{ $ifNull: ['$economy.bank', 0] }, delta] }]
                        }
                    }
                }
            ],
            { upsert: true, returnDocument: 'after' }
        );

        return {
            balance: this.sanitizeAmount(updated.economy?.balance),
            bank: this.sanitizeAmount(updated.economy?.bank),
        };
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
        const update = { 'economy.balance': this.sanitizeAmount(balance) };
        if (bank !== undefined) {
            update['economy.bank'] = this.sanitizeAmount(bank);
        }

        const updated = await UserData.findOneAndUpdate(
            { userId, guildId },
            { $set: update },
            { upsert: true, returnDocument: 'after' }
        );

        return {
            balance: this.sanitizeAmount(updated.economy?.balance),
            bank: this.sanitizeAmount(updated.economy?.bank),
        };
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
            balance: this.sanitizeAmount(u.economy?.balance),
            bank: this.sanitizeAmount(u.economy?.bank),
            total: this.sanitizeAmount(u.total)
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
