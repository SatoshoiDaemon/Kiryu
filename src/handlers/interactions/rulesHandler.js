// src/handlers/interactions/rulesHandler.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const Rule = require('@models/Rule');
const rulesManager = require('@utils/managers/rulesManager');
const cron = require('node-cron');

class RulesHandler {
    constructor() {
        // Cache to pass RuleID info between components for a user
        this.cache = new Map();
    }

    async handleButton(interaction) {
        const id = interaction.customId;

        if (id === 'rule:new') return this.showWizardPhase1(interaction);
        if (id === 'rule:list') return this.showDashboard(interaction, true);
        
        // Buttons requiring an active rule context
        if (id.startsWith('rule:edit:')) {
            const ruleId = id.replace('rule:edit:', '');
            return this.showRuleDetails(interaction, ruleId);
        }

        if (id.startsWith('rule:act:')) {
            const parts = id.split(':');
            const type = parts[2];
            const ruleId = parts.slice(3).join(':'); // Handle ruleIds with colons
            if (type === 'status') return this.toggleRuleStatus(interaction, ruleId);
            if (type === 'delete') return this.deleteRule(interaction, ruleId);
            if (type === 'payload') return this.showPayloadModal(interaction, ruleId);
        }

        // Wizard buttons - improved parsing
        if (id.startsWith('wizard:')) {
            const parts = id.split(':');
            const action = parts[1];
            const ruleId = parts[parts.length - 1]; // Last part is always ruleId
            
            if (action === 'next1') return this.showWizardPhase2(interaction, ruleId);
            if (action === 'next2') return this.showWizardPhase3(interaction, ruleId);
            if (action === 'next3') return this.showWizardPhase4(interaction, ruleId);
            if (action === 'next4') return this.showPayloadModalForWizard(interaction, ruleId);
            if (action === 'next5') return this.showWizardPhase6(interaction, ruleId);
            if (action === 'skip') return this.showWizardPhase6(interaction, ruleId);
            if (action === 'create') return this.createRuleFromWizard(interaction, ruleId);
            if (action === 'back') return this.handleWizardBack(interaction, ruleId);
            if (action === 'modal') {
                const type = parts[2];
                if (type === 'name') return this.showNameModal(interaction, ruleId);
                if (type === 'timer') return this.showTimerModal(interaction, ruleId);
                if (type === 'time') return this.showTimeModal(interaction, ruleId);
            }
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

        // Wizard selects
        if (id.startsWith('wizard:sel:')) {
            const [, , type, ruleId] = id.split(':');
            const value = interaction.values[0];

            if (type === 'trigger') {
                await Rule.findByIdAndUpdate(ruleId, { 'trigger.type': value });
                return this.showWizardPhase2(interaction, ruleId);
            }

            if (type === 'schedule_type') {
                const rule = await Rule.findById(ruleId);
                rule.trigger.config = { type: value };
                await rule.save();
                return this.showWizardPhase3(interaction, ruleId);
            }

            if (type === 'event_type') {
                const rule = await Rule.findById(ruleId);
                rule.trigger.config = { event: value };
                await rule.save();
                return this.showWizardPhase3(interaction, ruleId);
            }

            if (type === 'continuous_type') {
                const rule = await Rule.findById(ruleId);
                rule.trigger.config = { type: value };
                await rule.save();
                return this.showWizardPhase3(interaction, ruleId);
            }

            if (type === 'action') {
                await Rule.findByIdAndUpdate(ruleId, { 'action.type': value });
                return this.showWizardPhase4(interaction, ruleId);
            }

            if (type === 'channel') {
                await Rule.findByIdAndUpdate(ruleId, { 'action.targetChannelId': value });
                // Go to payload phase
                return this.showWizardPhase4(interaction, ruleId);
            }
        }
    }

    async handleModal(interaction) {
        const id = interaction.customId;

        if (id === 'modal:rule:new') {
            const name = interaction.fields.getTextInputValue('rule_name');
            const cronExp = interaction.fields.getTextInputValue('rule_cron');

            if (!cron.validate(cronExp)) {
                return interaction.reply({ content: '❌ Expressão cron inválida. Exemplo válido: `0 20 * * *`.', flags: 64 });
            }

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
            
            const currentRule = await Rule.findById(ruleId);
            const validationError = this.validatePayload(currentRule?.action?.type, payload);
            if (validationError) return interaction.reply({ content: validationError, flags: 64 });

            const rule = await Rule.findByIdAndUpdate(ruleId, { 'action.payload': payload.trim() }, { new: true });
            rulesManager.loadRule(rule);
            
            return this.showRuleDetails(interaction, ruleId, true);
        }

        // Wizard modals
        if (id.startsWith('modal:wizard:')) {
            const [, , phase, ruleId] = id.split(':');

            if (phase === 'name') {
                const name = interaction.fields.getTextInputValue('rule_name');
                if (!name?.trim()) {
                    return interaction.reply({ content: '❌ O nome da regra não pode estar vazio.', flags: 64 });
                }
                await Rule.findByIdAndUpdate(ruleId, { name: name.trim() });
                return this.showWizardPhase2(interaction, ruleId);
            }

            if (phase === 'timer') {
                const value = interaction.fields.getTextInputValue('timer_value');
                const rule = await Rule.findById(ruleId);
                rule.trigger.config.value = value;
                await rule.save();
                return this.showWizardPhase4(interaction, ruleId);
            }

            if (phase === 'time') {
                const value = interaction.fields.getTextInputValue('time_value');
                const rule = await Rule.findById(ruleId);
                rule.trigger.config.value = value;
                await rule.save();
                return this.showWizardPhase4(interaction, ruleId);
            }

            if (phase === 'payload') {
                const payload = interaction.fields.getTextInputValue('rule_payload');
                const rule = await Rule.findById(ruleId);
                const validationError = this.validatePayload(rule.action.type, payload);
                if (validationError) return interaction.reply({ content: validationError, flags: 64 });

                await Rule.findByIdAndUpdate(ruleId, { 'action.payload': payload.trim() });
                return this.showWizardPhase5(interaction, ruleId);
            }
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
            .setDescription(`Gerencie tarefas automatizadas do servidor.\n**Regras ativas:** ${rules.filter(r => r.enabled).length}/${rules.length}`)
            .setFooter(tengokuFooter());

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rule:new').setLabel('➕ Nova Regra').setStyle(ButtonStyle.Success)
        );

        const components = [row1];

        if (rules.length > 0) {
            const options = rules.map(r => ({
                label: r.name,
                description: `${this.getRuleStatus(r)} | ${this.formatTrigger(r.trigger)}`,
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

        const validation = rulesManager.validateRule(rule);

        const embed = new EmbedBuilder()
            .setColor(rule.enabled && validation.valid ? PALETTE.success : PALETTE.secondary)
            .setTitle(`Regra: ${rule.name}`)
            .setDescription(`**Gatilho:** ${this.formatTrigger(rule.trigger)}\n**Status:** ${this.getRuleStatus(rule)}\n**Validação:** ${validation.valid ? '✅ Pronta' : `❌ ${validation.reason}`}`)
            .addFields(
                { name: 'Tipo de Ação', value: rule.action.type.toUpperCase(), inline: true },
                { name: 'Canal Alvo', value: `<#${rule.action.targetChannelId}>`, inline: true },
                { name: 'Payload (Texto/Qtd)', value: rule.action.payload ? `\`${rule.action.payload}\`` : '`Não configurado`', inline: false },
                { name: 'Timezone', value: rule.timezone, inline: true }
            )
            .setFooter(tengokuFooter('Defina os parâmetros faltantes nos botões abaixo'));

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
                    { label: 'Enviar Mensagem', value: 'send', description: 'Envia um texto (define no payload)' },
                    { label: 'Reagir com Emoji', value: 'react', description: 'Adiciona reação à mensagem' }
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

        if (rule.enabled) {
            const validation = rulesManager.validateRule(rule);
            if (!validation.valid) {
                return interaction.reply({ content: `❌ Não foi possível ativar a regra: ${validation.reason}`, flags: 64 });
            }
        }

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

    async showWizardPhase1(interaction) {
        // Create temporary rule for wizard
        const tempRule = new Rule({
            guildId: interaction.guildId,
            name: 'Regra Temporária',
            trigger: { type: 'schedule', config: {} },
            action: { type: 'send', targetChannelId: interaction.channelId },
            enabled: false
        });
        await tempRule.save();

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🧙‍♂️ Assistente de Criação de Regras - Fase 1/6')
            .setDescription('Vamos criar uma nova regra! Primeiro, dê um nome para ela.')
            .setFooter(tengokuFooter('Clique no botão abaixo para definir o nome'));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wizard:modal:name:${tempRule._id}`).setLabel('Definir Nome').setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    async showWizardPhase2(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        if (!rule) return interaction.reply({ content: 'Regra não encontrada.', flags: 64 });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🧙‍♂️ Assistente - Fase 2/6: Escolher Gatilho')
            .setDescription('Escolha o tipo de gatilho para sua nova regra.\n\n**Opções:**')
            .addFields(
                { name: '⏰ Agendamento (Schedule)', value: 'Executa em horários específicos ou intervalos recorrentes.', inline: false },
                { name: '📢 Evento (Event)', value: 'Executa quando algo acontece no servidor (ex: mensagem com palavra específica).', inline: false },
                { name: '🔄 Contínuo (Continuous)', value: 'Executa automaticamente em mensagens (ex: reagir com emoji).', inline: false }
            )
            .setFooter(tengokuFooter('Selecione o tipo de gatilho abaixo'));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`wizard:sel:trigger:${ruleId}`)
                .setPlaceholder('Escolha o tipo de gatilho...')
                .addOptions([
                    { label: '⏰ Agendamento', value: 'schedule', description: 'Horários ou intervalos fixos' },
                    { label: '📢 Evento', value: 'event', description: 'Baseado em ações do servidor' },
                    { label: '🔄 Contínuo', value: 'continuous', description: 'Reações automáticas' }
                ])
        );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async showWizardPhase3(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        if (!rule) return interaction.reply({ content: 'Regra não encontrada.', flags: 64 });

        let embed, components;

        if (rule.trigger.type === 'schedule') {
            if (rule.trigger.config.type === 'timer') {
                embed = new EmbedBuilder()
                    .setColor(PALETTE.primary)
                    .setTitle('🧙‍♂️ Assistente - Fase 3/6: Configurar Timer')
                    .setDescription('Defina o intervalo do timer.\n\n**Formatos aceitos:**\n- `30s` (segundos)\n- `5m` (minutos)\n- `2h` (horas)\n- `1d` (dias)')
                    .setFooter(tengokuFooter('Clique no botão abaixo para definir'));

                components = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`wizard:modal:timer:${ruleId}`).setLabel('Definir Timer').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`wizard:back:${ruleId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
                )];
            } else if (rule.trigger.config.type === 'time') {
                embed = new EmbedBuilder()
                    .setColor(PALETTE.primary)
                    .setTitle('🧙‍♂️ Assistente - Fase 3/6: Configurar Horário')
                    .setDescription('Defina o horário específico.\n\n**Formato:** `HH:MM` (ex: `12:00`, `16:30`)')
                    .setFooter(tengokuFooter('Clique no botão abaixo para definir'));

                components = [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`wizard:modal:time:${ruleId}`).setLabel('Definir Horário').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`wizard:back:${ruleId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
                )];
            }
        } else {
            // For event/continuous, go to action selection
            embed = new EmbedBuilder()
                .setColor(PALETTE.primary)
                .setTitle('🧙‍♂️ Assistente - Fase 3/6: Escolher Ação')
                .setDescription('O que a regra deve fazer quando ativada?')
                .setFooter(tengokuFooter('Selecione a ação'));

            components = [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`wizard:sel:action:${ruleId}`)
                    .setPlaceholder('Escolha a ação...')
                    .addOptions([
                        { label: '🔒 Trancar Canal', value: 'lock', description: 'Remove permissão de enviar mensagens' },
                        { label: '🔓 Destrancar Canal', value: 'unlock', description: 'Restaura permissão de enviar mensagens' },
                        { label: '🧹 Limpar Mensagens', value: 'purge', description: 'Deleta mensagens recentes' },
                        { label: '💬 Enviar Mensagem', value: 'send', description: 'Envia uma mensagem no canal' },
                        { label: '😀 Reagir com Emoji', value: 'react', description: 'Adiciona reação à mensagem' }
                    ]),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`wizard:back:${ruleId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
                )
            )];
        }

        await interaction.update({ embeds: [embed], components });
    }

    async showWizardPhase4(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        if (!rule) return interaction.reply({ content: 'Regra não encontrada.', flags: 64 });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🧙‍♂️ Assistente - Fase 4/6: Configurar Ação')
            .setDescription('Configure os detalhes da ação.')
            .addFields(
                { name: 'Ação Selecionada', value: rule.action.type.toUpperCase(), inline: true },
                { name: 'Canal Alvo', value: 'Selecione abaixo', inline: true }
            )
            .setFooter(tengokuFooter('Configure o canal e payload'));

        const row1 = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`wizard:sel:channel:${ruleId}`)
                .setPlaceholder('Selecionar Canal Alvo...')
                .setChannelTypes(ChannelType.GuildText)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wizard:next4:${ruleId}`).setLabel('Definir Payload').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wizard:back:${ruleId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [embed], components: [row1, row2] });
    }

    async showWizardPhase5(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        if (!rule) return interaction.reply({ content: 'Regra não encontrada.', flags: 64 });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🧙‍♂️ Assistente - Fase 5/6: Adicionar Condições (Opcional)')
            .setDescription('Deseja adicionar condições para quando a regra deve ser executada?\n\n**Condições disponíveis:**\n- **Conteúdo**: Verificar se a mensagem contém certas palavras\n- **Canal**: Executar apenas em canais específicos\n- **Autor**: Executar apenas para usuários específicos\n- **Horário**: Executar apenas em determinados horários')
            .addFields(
                { name: 'Condições Atuais', value: rule.conditions?.length > 0 ? rule.conditions.map(c => `${c.field}: ${c.operator} "${c.value}"`).join('\n') : 'Nenhuma condição definida', inline: false }
            )
            .setFooter(tengokuFooter('Você pode pular esta etapa se não precisar de condições'));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wizard:next5:${ruleId}`).setLabel('Adicionar Condição').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`wizard:skip:${ruleId}`).setLabel('Pular para Finalizar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`wizard:back:${ruleId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async handleWizardBack(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        if (!rule) return interaction.reply({ content: 'Regra não encontrada.', flags: 64 });

        // Determine which phase we're in based on rule state
        if (rule.trigger.config && rule.trigger.config.type) {
            // We're in phase 3 or later, go back to phase 2
            return this.showWizardPhase2(interaction, ruleId);
        } else if (rule.trigger.type && rule.trigger.type !== 'schedule') {
            // For event/continuous, go back to phase 1
            return this.showWizardPhase1(interaction);
        } else if (rule.trigger.type === 'schedule') {
            // Schedule without config means we're in phase 2
            return this.showWizardPhase1(interaction);
        } else {
            // Default to phase 1
            return this.showWizardPhase1(interaction);
        }
    }

    async showNameModal(interaction, ruleId) {
        const modal = new ModalBuilder().setCustomId(`modal:wizard:name:${ruleId}`).setTitle('Nome da Regra');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('rule_name').setLabel('Nome da Regra').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: Limpeza diária do chat')
        ));
        await interaction.showModal(modal);
    }

    async showPayloadModalForWizard(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        const modal = new ModalBuilder().setCustomId(`modal:wizard:payload:${ruleId}`).setTitle('Definir Payload');
        const isPurge = rule.action.type === 'purge';
        const isReact = rule.action.type === 'react';
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('rule_payload')
                .setLabel(isPurge ? 'Quantidade (1-100)' : isReact ? 'Emoji (ex: 👍)' : 'Mensagem')
                .setStyle(isPurge || isReact ? TextInputStyle.Short : TextInputStyle.Paragraph)
                .setRequired(true)
        ));
        await interaction.showModal(modal);
    }

    async showPayloadModal(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        const modal = new ModalBuilder().setCustomId(`modal:rule:payload:${ruleId}`).setTitle('Configurar Parâmetro');
        
        const isPurge = rule.action.type === 'purge';
        const isReact = rule.action.type === 'react';
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('rule_payload')
                    .setLabel(isPurge ? 'Quantidade a apagar (1-100)' : isReact ? 'Emoji para reagir (ex: 👍)' : 'Mensagem a ser enviada')
                    .setStyle(isPurge || isReact ? TextInputStyle.Short : TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setValue(rule.action.payload || (isPurge ? '10' : ''))
            )
        );

        await interaction.showModal(modal);
    }

    async showWizardPhase6(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        if (!rule) return interaction.reply({ content: 'Regra não encontrada.', flags: 64 });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🧙‍♂️ Assistente - Fase 6/6: Finalizar')
            .setDescription('Revise as configurações e ative a regra.')
            .addFields(
                { name: 'Nome', value: rule.name, inline: true },
                { name: 'Gatilho', value: this.formatTrigger(rule.trigger), inline: true },
                { name: 'Ação', value: `${rule.action.type.toUpperCase()} em <#${rule.action.targetChannelId}>`, inline: true },
                { name: 'Payload', value: rule.action.payload || 'Nenhum', inline: true },
                { name: 'Condições', value: rule.conditions?.length > 0 ? rule.conditions.map(c => `${c.field}: ${c.operator} "${c.value}"`).join('\n') : 'Nenhuma', inline: false },
                { name: 'Timezone', value: rule.timezone, inline: true }
            )
            .setFooter(tengokuFooter('Clique em Criar para ativar a regra'));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wizard:create:${ruleId}`).setLabel('✅ Criar Regra').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`wizard:back:${ruleId}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async createRuleFromWizard(interaction, ruleId) {
        const rule = await Rule.findById(ruleId);
        if (!rule) return interaction.reply({ content: 'Regra não encontrada.', flags: 64 });

        rule.enabled = true;
        await rule.save();
        rulesManager.loadRule(rule);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('✅ Regra Criada com Sucesso!')
            .setDescription(`A regra "${rule.name}" foi criada e ativada.`)
            .setFooter(tengokuFooter());

        await interaction.update({ embeds: [embed], components: [] });
    }

    validatePayload(actionType, payload) {
        const value = String(payload || '').trim();
        if (actionType === 'purge') {
            const amount = Number.parseInt(value, 10);
            if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
                return '❌ Para limpar mensagens, informe uma quantidade entre 1 e 100.';
            }
        }

        if (actionType === 'send' && !value) {
            return '❌ Para enviar mensagem, informe um texto.';
        }

        if (actionType === 'react' && !value) {
            return '❌ Para reagir, informe um emoji.';
        }

        return null;
    }

    getRuleStatus(rule) {
        if (!rule.enabled) return '🔴 Inativa';
        const validation = rulesManager.validateRule(rule);
        return validation.valid ? '🟢 Ativa' : '🟠 Inválida';
    }

    formatTrigger(trigger) {
        if (!trigger || !trigger.type) return 'DESCONHECIDA';
        
        if (trigger.type === 'schedule') {
            const config = trigger.config;
            if (config && config.type === 'timer') return `Timer: ${config.value || 'N/A'}`;
            if (config && config.type === 'time') return `Horário: ${config.value || 'N/A'}`;
        }
        if (trigger.type === 'event') {
            const config = trigger.config;
            return `Evento: ${config?.event || 'messageCreate'}`;
        }
        if (trigger.type === 'continuous') {
            const config = trigger.config;
            return `Contínuo: ${config?.type || 'reaction'}`;
        }
        return trigger.type.toUpperCase();
    }
}

module.exports = new RulesHandler();
