/**
 * src/utils/managers/rulesManager.js
 * Gerenciador de regras e integrações agendadas (Cron)
 */

const cron = require('node-cron');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Rule = require('@models/Rule');
const logger = require('@utils/logger');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

class RulesManager {
    constructor() {
        // Map: ruleId -> cron.ScheduledTask
        this.scheduledJobs = new Map();
        this.client = null;
    }

    /**
     * Inicializa o manager passando o client do bot
     */
    async init(client) {
        this.client = client;
        logger.info('[RulesManager] Inicializando agendamentos...');
        
        try {
            const rules = await Rule.find({ enabled: true });
            let count = 0;
            
            for (const rule of rules) {
                if (this.loadRule(rule)) {
                    count++;
                }
            }
            logger.info(`[RulesManager] ${count} regras agendadas com sucesso.`);
        } catch (err) {
            logger.error(`[RulesManager] Erro ao buscar regras no banco: ${err.message}`);
        }
    }

    /**
     * Carrega/Agenda uma regra no cron
     * @param {Object} ruleDoc Documento do Mongoose (Rule)
     */
    loadRule(ruleDoc) {
        if (!ruleDoc || !ruleDoc.enabled) return false;

        // Se já existe, cancela a antiga
        this.unloadRule(ruleDoc._id.toString());

        try {
            // Verifica se a expressão cron é válida
            if (!cron.validate(ruleDoc.cronExpression)) {
                logger.warn(`[RulesManager] Expressão cron inválida para regra ID ${ruleDoc._id}: ${ruleDoc.cronExpression}`);
                return false;
            }

            const task = cron.schedule(ruleDoc.cronExpression, async () => {
                await this.executeAction(ruleDoc);
            });

            this.scheduledJobs.set(ruleDoc._id.toString(), task);
            return true;
        } catch (err) {
            logger.error(`[RulesManager] Erro ao agendar cron da regra ${ruleDoc._id}: ${err.message}`);
            return false;
        }
    }

    /**
     * Remove do agendamento (memória)
     * @param {string} ruleId ObjectId como string
     */
    unloadRule(ruleId) {
        if (this.scheduledJobs.has(ruleId)) {
            const task = this.scheduledJobs.get(ruleId);
            task.stop();
            this.scheduledJobs.delete(ruleId);
        }
    }

    /**
     * Recarrega todas as regras (útil em /regras recarregar global ou resyncs manuais)
     */
    async reloadAll() {
        for (const [id, task] of this.scheduledJobs.entries()) {
            task.stop();
        }
        this.scheduledJobs.clear();
        await this.init(this.client);
    }

    /**
     * Executa a regra formatada no momento do Gatilho
     */
    async executeAction(ruleDoc) {
        if (!this.client) return;
        
        try {
            const guild = await this.client.guilds.fetch(ruleDoc.guildId).catch(() => null);
            if (!guild) {
                // Guilda não encontrada: Bot foi removido? Opcional: Desativar a regra
                return;
            }

            const channelId = ruleDoc.action?.targetChannelId;
            if (!channelId) return;

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                logger.warn(`[RulesManager] (Regra ${ruleDoc._id}) Canal ${channelId} não encontrado. Ignorando.`);
                return;
            }

            const botMember = await guild.members.fetch(this.client.user.id);

            switch (ruleDoc.action.type) {
                case 'lock': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageRoles)) {
                        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
                        channel.send({ embeds: [new EmbedBuilder().setColor(PALETTE.warning).setDescription('🔒 **Bot:** Este canal foi trancado automaticamente.').setFooter(olympusFooter())] }).catch(() => null);
                    }
                    break;
                }
                case 'unlock': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageRoles)) {
                        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
                        channel.send({ embeds: [new EmbedBuilder().setColor(PALETTE.success).setDescription('🔓 **Bot:** Este canal foi destrancado automaticamente.').setFooter(olympusFooter())] }).catch(() => null);
                    }
                    break;
                }
                case 'purge': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageMessages)) {
                        const amount = parseInt(ruleDoc.action.payload) || 100;
                        const messages = await channel.messages.fetch({ limit: amount });
                        const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 1209600000);
                        if (deletable.size > 0) {
                            await channel.bulkDelete(deletable, true);
                        }
                    }
                    break;
                }
                case 'send': {
                    if (channel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
                        const text = ruleDoc.action.payload || 'Mensagem agendada!';
                        await channel.send({ content: text });
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
