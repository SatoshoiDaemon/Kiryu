/**
 * src/utils/managers/rulesManager.js
 * Gerenciador de regras e integrações agendadas e baseadas em eventos
 */

const schedule = require('node-schedule');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Rule = require('@models/Rule');
const logger = require('@utils/logger');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

class RulesManager {
    constructor() {
        // Map: ruleId -> schedule.Job
        this.scheduledJobs = new Map();
        // Map: eventName -> array of ruleIds
        this.eventRules = new Map();
        this.client = null;
    }

    validateRule(ruleDoc) {
        if (!ruleDoc) return { valid: false, reason: 'Regra não encontrada.' };
        if (!ruleDoc.name?.trim()) return { valid: false, reason: 'Nome da regra ausente.' };
        if (!ruleDoc.trigger?.type || !['schedule', 'event', 'continuous'].includes(ruleDoc.trigger.type)) {
            return { valid: false, reason: 'Tipo de trigger inválido.' };
        }
        if (!ruleDoc.action?.targetChannelId) return { valid: false, reason: 'Canal alvo não configurado.' };

        const actionType = ruleDoc.action?.type;
        if (!['lock', 'unlock', 'purge', 'send', 'react'].includes(actionType)) {
            return { valid: false, reason: 'Tipo de ação inválido.' };
        }

        if (actionType === 'purge') {
            const amount = Number.parseInt(ruleDoc.action.payload, 10);
            if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
                return { valid: false, reason: 'Payload de limpeza deve ser um número entre 1 e 100.' };
            }
        }

        if (actionType === 'send' && !String(ruleDoc.action.payload || '').trim()) {
            return { valid: false, reason: 'Payload de mensagem não pode estar vazio.' };
        }

        if (actionType === 'react' && !String(ruleDoc.action.payload || '').trim()) {
            return { valid: false, reason: 'Payload de reação não pode estar vazio.' };
        }

        // Validate trigger config
        if (ruleDoc.trigger.type === 'schedule') {
            const config = ruleDoc.trigger.config;
            if (!config || !config.type || !['timer', 'time'].includes(config.type)) {
                return { valid: false, reason: 'Configuração de schedule inválida.' };
            }
            if (config.type === 'timer' && !config.value) {
                return { valid: false, reason: 'Valor do timer ausente.' };
            }
            if (config.type === 'time' && !config.value) {
                return { valid: false, reason: 'Horário ausente.' };
            }
        }

        if (ruleDoc.trigger.type === 'event') {
            const config = ruleDoc.trigger.config;
            if (!config || !config.event || !['messageCreate', 'messageReactionAdd', 'messageDelete', 'guildMemberAdd', 'guildMemberRemove'].includes(config.event)) {
                return { valid: false, reason: 'Evento para trigger inválido ou ausente.' };
            }
        }

        if (ruleDoc.trigger.type === 'continuous') {
            const config = ruleDoc.trigger.config;
            if (!config || !config.type || !['reaction', 'keyword'].includes(config.type)) {
                return { valid: false, reason: 'Configuração de trigger contínuo inválida.' };
            }
        }

        return { valid: true, reason: 'Pronta.' };
    }

    /**
     * Inicializa o manager passando o client do bot
     */
    async init(client) {
        this.client = client;
        logger.info('[RulesManager] Inicializando agendamentos e listeners...');

        try {
            const rules = await Rule.find({ enabled: true });
            let scheduleCount = 0;
            let eventCount = 0;

            for (const rule of rules) {
                if (this.loadRule(rule)) {
                    if (rule.trigger.type === 'schedule') scheduleCount++;
                    else eventCount++;
                }
            }

            this.setupEventListeners();
            logger.info(`[RulesManager] ${scheduleCount} regras agendadas e ${eventCount} regras de evento carregadas.`);
        } catch (err) {
            logger.error(`[RulesManager] Erro ao buscar regras no banco: ${err.message}`);
        }
    }

    /**
     * Carrega/Agenda uma regra
     * @param {Object} ruleDoc Documento do Mongoose (Rule)
     */
    loadRule(ruleDoc) {
        if (!ruleDoc || !ruleDoc.enabled) return false;

        // Se já existe, cancela a antiga
        this.unloadRule(ruleDoc._id.toString());

        try {
            const validation = this.validateRule(ruleDoc);
            if (!validation.valid) {
                logger.warn(`[RulesManager] Regra ${ruleDoc._id} não carregada: ${validation.reason}`);
                return false;
            }

            const ruleId = ruleDoc._id.toString();

            if (ruleDoc.trigger.type === 'schedule') {
                const job = this.createScheduleJob(ruleDoc);
                if (job) {
                    this.scheduledJobs.set(ruleId, job);
                    return true;
                }
            } else if (ruleDoc.trigger.type === 'event' || ruleDoc.trigger.type === 'continuous') {
                const event = ruleDoc.trigger.config.event || (ruleDoc.trigger.type === 'continuous' ? 'messageCreate' : 'messageCreate');
                if (!this.eventRules.has(event)) {
                    this.eventRules.set(event, []);
                }
                this.eventRules.get(event).push(ruleId);
                return true;
            }
        } catch (err) {
            logger.error(`[RulesManager] Erro ao carregar regra ${ruleDoc._id}: ${err.message}`);
            return false;
        }
        return false;
    }

    createScheduleJob(ruleDoc) {
        const config = ruleDoc.trigger.config;
        const tz = ruleDoc.timezone || 'America/Sao_Paulo';

        if (config.type === 'timer') {
            // Timer: e.g., '30m', '1h', recurring
            const interval = require('ms')(config.value);
            if (!interval) return null;
            return schedule.scheduleJob({ rule: `*/${Math.floor(interval / 1000)} * * * * *`, tz }, () => {
                this.executeAction(ruleDoc);
            });
        } else if (config.type === 'time') {
            // Specific time: e.g., '12:00', daily
            const [hour, minute] = config.value.split(':').map(Number);
            if (isNaN(hour) || isNaN(minute)) return null;
            return schedule.scheduleJob({ hour, minute, tz }, () => {
                this.executeAction(ruleDoc);
            });
        }
        return null;
    }

    setupEventListeners() {
        // Setup listeners for events used in rules
        for (const [event, ruleIds] of this.eventRules.entries()) {
            if (event === 'messageCreate') {
                this.client.on('messageCreate', async (message) => {
                    for (const ruleId of ruleIds) {
                        const rule = await Rule.findById(ruleId);
                        if (rule && this.checkConditions(rule, message)) {
                            await this.executeAction(rule, message);
                        }
                    }
                });
            } else if (event === 'messageReactionAdd') {
                this.client.on('messageReactionAdd', async (reaction, user) => {
                    for (const ruleId of ruleIds) {
                        const rule = await Rule.findById(ruleId);
                        if (rule && this.checkConditions(rule, { reaction, user, message: reaction.message })) {
                            await this.executeAction(rule, { reaction, user, message: reaction.message });
                        }
                    }
                });
            } else if (event === 'messageDelete') {
                this.client.on('messageDelete', async (message) => {
                    for (const ruleId of ruleIds) {
                        const rule = await Rule.findById(ruleId);
                        if (rule && this.checkConditions(rule, message)) {
                            await this.executeAction(rule, message);
                        }
                    }
                });
            } else if (event === 'guildMemberAdd') {
                this.client.on('guildMemberAdd', async (member) => {
                    for (const ruleId of ruleIds) {
                        const rule = await Rule.findById(ruleId);
                        if (rule && this.checkConditions(rule, member)) {
                            await this.executeAction(rule, member);
                        }
                    }
                });
            } else if (event === 'guildMemberRemove') {
                this.client.on('guildMemberRemove', async (member) => {
                    for (const ruleId of ruleIds) {
                        const rule = await Rule.findById(ruleId);
                        if (rule && this.checkConditions(rule, member)) {
                            await this.executeAction(rule, member);
                        }
                    }
                });
            }
            // Add more events as needed
        }
    }

    checkConditions(ruleDoc, context) {
        if (!ruleDoc.conditions || ruleDoc.conditions.length === 0) return true;

        let result = true;
        for (const condition of ruleDoc.conditions) {
            const fieldValue = this.getFieldValue(condition.field, context);
            const matches = this.evaluateCondition(fieldValue, condition.operator, condition.value);
            if (condition.logic === 'AND') {
                result = result && matches;
            } else {
                result = result || matches;
            }
        }
        return result;
    }

    getFieldValue(field, context) {
        switch (field) {
            case 'content': return context.content;
            case 'channel': return context.channel.id;
            case 'author': return context.author.id;
            case 'time': return context.createdAt;
            default: return null;
        }
    }

    evaluateCondition(value, operator, expected) {
        switch (operator) {
            case 'contains': return String(value).includes(expected);
            case 'equals': return String(value) === expected;
            case 'matches': return new RegExp(expected).test(String(value));
            case 'in': return value === expected;
            default: return false;
        }
    }

    /**
     * Remove do agendamento (memória)
     * @param {string} ruleId ObjectId como string
     */
    unloadRule(ruleId) {
        if (this.scheduledJobs.has(ruleId)) {
            const job = this.scheduledJobs.get(ruleId);
            job.cancel();
            this.scheduledJobs.delete(ruleId);
        }
        // Remove from event rules
        for (const [event, ruleIds] of this.eventRules.entries()) {
            const index = ruleIds.indexOf(ruleId);
            if (index > -1) {
                ruleIds.splice(index, 1);
                if (ruleIds.length === 0) {
                    this.eventRules.delete(event);
                }
                break;
            }
        }
    }

    /**
     * Recarrega todas as regras (útil em /regras recarregar global ou resyncs manuais)
     */
    async reloadAll() {
        for (const [id, job] of this.scheduledJobs.entries()) {
            job.cancel();
        }
        this.scheduledJobs.clear();
        this.eventRules.clear();
        await this.init(this.client);
    }

    /**
     * Executa a regra formatada no momento do Gatilho
     * @param {Object} ruleDoc 
     * @param {Object} context Contexto do evento (message, etc.) para event triggers
     */
    async executeAction(ruleDoc, context = null) {
        if (!this.client) return;
        
        try {
            const guild = await this.client.guilds.fetch(ruleDoc.guildId).catch(() => null);
            if (!guild) {
                logger.warn(`[RulesManager] Regra ${ruleDoc._id} ignorada: guilda ${ruleDoc.guildId} não encontrada.`);
                return;
            }

            const channelId = ruleDoc.action?.targetChannelId;
            if (!channelId) {
                logger.warn(`[RulesManager] Regra ${ruleDoc._id} ignorada: canal alvo ausente.`);
                return;
            }

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                logger.warn(`[RulesManager] Regra ${ruleDoc._id} ignorada: canal ${channelId} não encontrado na guilda ${guild.id}.`);
                return;
            }

            const botMember = await guild.members.fetch(this.client.user.id);

            switch (ruleDoc.action.type) {
                case 'lock': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageRoles)) {
                        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
                        channel.send({ embeds: [new EmbedBuilder().setColor(PALETTE.warning).setDescription('🔒 **Bot:** Este canal foi trancado automaticamente.').setFooter(tengokuFooter())] }).catch(() => null);
                    } else {
                        logger.warn(`[RulesManager] Regra ${ruleDoc._id} sem permissão ManageRoles no canal ${channelId}.`);
                    }
                    break;
                }
                case 'unlock': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageRoles)) {
                        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
                        channel.send({ embeds: [new EmbedBuilder().setColor(PALETTE.success).setDescription('🔓 **Bot:** Este canal foi destrancado automaticamente.').setFooter(tengokuFooter())] }).catch(() => null);
                    } else {
                        logger.warn(`[RulesManager] Regra ${ruleDoc._id} sem permissão ManageRoles no canal ${channelId}.`);
                    }
                    break;
                }
                case 'purge': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageMessages)) {
                        const amount = Math.min(100, Math.max(1, parseInt(ruleDoc.action.payload, 10) || 100));
                        const messages = await channel.messages.fetch({ limit: amount });
                        const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 1209600000);
                        if (deletable.size > 0) {
                            await channel.bulkDelete(deletable, true);
                        }
                    } else {
                        logger.warn(`[RulesManager] Regra ${ruleDoc._id} sem permissão ManageMessages no canal ${channelId}.`);
                    }
                    break;
                }
                case 'send': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
                        const text = ruleDoc.action.payload || 'Mensagem agendada!';
                        await channel.send({ content: text });
                    } else {
                        logger.warn(`[RulesManager] Regra ${ruleDoc._id} sem permissão SendMessages no canal ${channelId}.`);
                    }
                    break;
                }
                case 'react': {
                    if (context && typeof context.react === 'function') {
                        const emoji = ruleDoc.action.payload;
                        await context.react(emoji).catch(() => null);
                    }
                    break;
                }
            }

            logger.info(`[RulesManager] Regra (${ruleDoc.action.type}) executada no canal ${channelId} (Guilda: ${guild.id})`);
        } catch (err) {
            logger.error(`[RulesManager] Erro executando a regra ${ruleDoc._id} (${ruleDoc.action?.type}): ${err.message}`);
        }
    }
}

module.exports = new RulesManager();
