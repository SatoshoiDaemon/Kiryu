// src/handlers/interactions/rulesHandler.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const Rule = require('@models/Rule');
const rulesManager = require('@utils/managers/rulesManager');

class RulesHandler {
    constructor() {
        // Cache to pass RuleID info between components for a user
        this.cache = new Map();
    }

    async handleButton(interaction) {
        const id = interaction.customId;

        if (id === 'rule:new') return this.showRuleModal(interaction);
        if (id === 'rule:list') return this.showDashboard(interaction, true);
        
        // Buttons requiring an active rule context
        if (id.startsWith('rule:edit:')) {
            const ruleId = id.split(':')[2];
            return this.showRuleDetails(interaction, ruleId);
        }

        if (id.startsWith('rule:act:')) {
            const [, , type, ruleId] = id.split(':');
            if (type === 'status') return this.toggleRuleStatus(interaction, ruleId);
            if (type === 'delete') return this.deleteRule(interaction, ruleId);
            if (type === 'payload') return this.showPayloadModal(interaction, ruleId);
        }
    }

    async handleSelect(interaction) {
        const id = interaction.customId;

        if (id === 'rule:select') {
            const ruleId = interaction.values[0];
            return this.showRuleDetails(interaction, ruleId);
        }

        if (id.startsWith('rule:sel:')) {
            const [, , type, ruleId] = id.split(':');
            
            if (type === 'channel') {
                const channelId = interaction.values[0];
                await Rule.findByIdAndUpdate(ruleId, { 'action.targetChannelId': channelId });
                rulesManager.loadRule(await Rule.findById(ruleId));
                return this.showRuleDetails(interaction, ruleId);
            }

            if (type === 'action') {
                const actionType = interaction.values[0];
                await Rule.findByIdAndUpdate(ruleId, { 'action.type': actionType });
                rulesManager.loadRule(await Rule.findById(ruleId));
                return this.showRuleDetails(interaction, ruleId);
            }
        }
    }

    async handleModal(interaction) {
        const id = interaction.customId;

        if (id === 'modal:rule:new') {
            const name = interaction.fields.getTextInputValue('rule_name');
            const cronExp = interaction.fields.getTextInputValue('rule_cron');

            // Regex Cron Básico (Validação em profundidade fica no node-cron via rulesManager.loadRule)
            const newRule = new Rule({
                guildId: interaction.guildId,
                name,
                cronExpression: cronExp,
                action: { type: 'send', targetChannelId: interaction.channelId }, // Default Temporário
                enabled: false // Cria desabilitado para concluir configuração
            });

            await newRule.save();
            return this.showRuleDetails(interaction, newRule._id.toString(), true);
        }

        if (id.startsWith('modal:rule:payload:')) {
            const ruleId = id.split(':')[3];
            const payload = interaction.fields.getTextInputValue('rule_payload');
            
            const rule = await Rule.findByIdAndUpdate(ruleId, { 'action.payload': payload }, { new: true });
            rulesManager.loadRule(rule);
            
            return this.showRuleDetails(interaction, ruleId, true);
        }
    }

    // ==========================================
    // UI Renderers
    // ==========================================

    async showDashboard(interaction, isUpdate = false) {
        const rules = await Rule.find({ guildId: interaction.guildId });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('⚙️ Central de Automações & Regras')
            .setDescription(`Gerencie tarefas automatizadas (Agendamentos Cron) do servidor.\n**Regras ativas:** ${rules.filter(r => r.enabled).length}/${rules.length}`)
            .setFooter(olympusFooter());

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rule:new').setLabel('➕ Nova Regra').setStyle(ButtonStyle.Success)
        );

        const components = [row1];

        if (rules.length > 0) {
            const options = rules.map(r => ({
                label: r.name,
                description: `${r.enabled ? '🟢 Ativa' : '🔴 Inativa'} | Cron: ${r.cronExpression}`,
                value: r._id.toString()
            })).slice(0, 25); // Max 25 por Menu

            const menu = new StringSelectMenuBuilder()
                .setCustomId('rule:select')
                .setPlaceholder('Selecione uma regra para editar...')
                .addOptions(options);

            components.push(new ActionRowBuilder().addComponents(menu));
        } else {
            embed.addFields({ name: 'Lista Vazia', value: 'Nenhuma automação configurada neste servidor.' });
        }

        if (isUpdate) {
            await interaction.update({ embeds: [embed], components, ephemeral: true });
        } else {
            await interaction.editReply({ embeds: [embed], components });
        }
    }

    async showRuleDetails(interaction, ruleId, isModalResponse = false) {
        const rule = await Rule.findById(ruleId);
        if (!rule) {
            const msg = { content: '❌ Regra não encontrada (foi deletada?).', embeds: [], components: [], flags: 64 };
            return isModalResponse ? interaction.reply(msg) : interaction.update(msg);
        }

        const embed = new EmbedBuilder()
            .setColor(rule.enabled ? PALETTE.success : PALETTE.secondary)
            .setTitle(`Regra: ${rule.name}`)
            .setDescription(`**Cron:** \`${rule.cronExpression}\`\n**Status:** ${rule.enabled ? '🟢' : '🔴'}`)
            .addFields(
                { name: 'Tipo de Ação', value: rule.action.type.toUpperCase(), inline: true },
                { name: 'Canal Alvo', value: `<#${rule.action.targetChannelId}>`, inline: true },
                { name: 'Paylod (Texto/Qtd)', value: rule.action.payload ? `\`${rule.action.payload}\`` : '`Não configurado`', inline: false }
            )
            .setFooter(olympusFooter('Defina os parâmetros faltantes nos botões abaixo'));

        // Canal
        const row1 = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`rule:sel:channel:${rule._id}`)
                .setPlaceholder('1. Definir Canal Alvo...')
                .setChannelTypes(ChannelType.GuildText)
        );

        // Ação Info Menu
        const row2 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`rule:sel:action:${rule._id}`)
                .setPlaceholder('2. Definir Tipo de Ação...')
                .addOptions([
                    { label: 'Trancar (Lock)', value: 'lock', description: 'Tira Send Messages de @everyone' },
                    { label: 'Destrancar (Unlock)', value: 'unlock', description: 'Restaura Send Messages de @everyone' },
                    { label: 'Limpar (Purge)', value: 'purge', description: 'Limpa mensagens (define qtd no payload)' },
                    { label: 'Enviar Mensagem', value: 'send', description: 'Envia um texto (define no payload)' }
                ])
        );

        // Botões Básicos
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rule:act:payload:${rule._id}`).setLabel('3. Config Payload').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`rule:act:status:${rule._id}`).setLabel(rule.enabled ? 'Desativar Regra' : 'Ativar Regra').setStyle(rule.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rule:act:delete:${rule._id}`).setLabel('Apagar').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('rule:list').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        const replyObj = { embeds: [embed], components: [row1, row2, row3], ephemeral: true };
        
        if (isModalResponse) {
            await interaction.reply(replyObj);
        } else {
            await interaction.update(replyObj);
        }
    }

    async toggleRuleStatus(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        rule.enabled = !rule.enabled;
        await rule.save();

        if (rule.enabled) rulesManager.loadRule(rule);
        else rulesManager.unloadRule(ruleId);

        return this.showRuleDetails(interaction, ruleId);
    }

    async deleteRule(interaction, ruleId) {
        rulesManager.unloadRule(ruleId);
        await Rule.findByIdAndDelete(ruleId);
        return this.showDashboard(interaction, true);
    }

    // ==========================================
    // Modals
    // ==========================================

    async showRuleModal(interaction) {
        const modal = new ModalBuilder().setCustomId('modal:rule:new').setTitle('Criar Regra Agendada');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('rule_name').setLabel('Nome da Regra (ex: Lock Diário)').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('rule_cron').setLabel('Expressão Cron (ex: 0 20 * * *)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Min Hora Dia Mês DiaSem')
            )
        );

        await interaction.showModal(modal);
    }

    async showPayloadModal(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        const modal = new ModalBuilder().setCustomId(`modal:rule:payload:${ruleId}`).setTitle('Configurar Parâmetro');
        
        const isPurge = rule.action.type === 'purge';
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('rule_payload')
                    .setLabel(isPurge ? 'Quantidade a apagar (1-100)' : 'Mensagem a ser enviada')
                    .setStyle(isPurge ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setValue(rule.action.payload || (isPurge ? '10' : ''))
            )
        );

        await interaction.showModal(modal);
    }
}

module.exports = new RulesHandler();
