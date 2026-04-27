/**
 * src/utils/managers/autoResponseManager.js
 * Gerenciador de auto-respostas mantido em memória via Cache
 */

const AutoResponse = require('@models/AutoResponse');
const logger = require('@utils/logger');

class AutoResponseManager {
    constructor() {
        // Cache na memória: Map<guildId, Array<AutoResponseDoc>>
        // Previne consultar o Banco a cada mensagem lida no Discord
        this.cache = new Map();
    }

    /**
     * Inicializa o manager carregando as regras ativas de todas as guildas para o cache
     */
    async init() {
        logger.info('[AutoResponseManager] Carregando gatilhos na memória...');
        try {
            const rules = await AutoResponse.find({ enabled: true });
            
            for (const rule of rules) {
                if (!this.cache.has(rule.guildId)) {
                    this.cache.set(rule.guildId, []);
                }
                this.cache.get(rule.guildId).push(rule);
            }
            logger.info(`[AutoResponseManager] ${rules.length} gatilhos carregados.`);
        } catch (err) {
            logger.error(`[AutoResponseManager] Erro ao carregar as regras no cache: ${err.message}`);
        }
    }

    /**
     * Recarrega do banco apenas o cache de uma Guilda específica.
     * Deve ser chamado sempre que o Painel (/respostas) editar ou adicionar algo na guilda.
     * @param {string} guildId Id do Servidor
     */
    async reloadGuild(guildId) {
        try {
            const rules = await AutoResponse.find({ guildId, enabled: true });
            this.cache.set(guildId, rules);
        } catch (err) {
            logger.error(`[AutoResponseManager] Falha ao recarregar cache da guilda ${guildId}: ${err.message}`);
        }
    }

    /**
     * Analisa uma mensagem recebida e tenta engatilhar uma Resposta predefinida
     * @param {Message} message Objeto da mensagem do Discord
     */
    async handleMessage(message) {
        if (!message || message.author.bot || !message.guild) return;

        const rules = this.cache.get(message.guild.id);
        if (!rules || rules.length === 0) return;

        const contentRaw = message.content.toLowerCase();
        
        for (const rule of rules) {
            // Ignora se a array de mensagens estiver vazia
            if (!rule.responses || rule.responses.length === 0) continue;

            const trigger = rule.trigger.toLowerCase();
            let isMatch = false;

            if (rule.matchType === 'exact' && contentRaw === trigger) {
                isMatch = true;
            } else if (rule.matchType === 'contains' && contentRaw.includes(trigger)) {
                isMatch = true;
            }

            if (isMatch) {
                // Randomiza a possibilidade usando o número de respostas do Array
                const randomIndex = Math.floor(Math.random() * rule.responses.length);
                const selectedResponse = rule.responses[randomIndex];

                // Substitui tags dinâmicas se existirem (Pode ser estendido posteriomente)
                const finalContent = selectedResponse.replace(/{user}/gi, message.author.toString());
                
                // Envia e dá um Break (evita engatar multiplas respostas na mesma mensagem)
                await message.reply({ content: finalContent }).catch(() => null);
                break;
            }
        }
    }
}

module.exports = new AutoResponseManager();
