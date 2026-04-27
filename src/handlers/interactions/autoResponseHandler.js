// src/handlers/interactions/autoResponseHandler.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const AutoResponse = require('@models/AutoResponse');
const autoResponseManager = require('@utils/managers/autoResponseManager');

class AutoResponseHandler {
    
    async handleButton(interaction) {
        const id = interaction.customId;

        if (id === 'ar:new') return this.showNewTriggerModal(interaction);
        if (id === 'ar:list') return this.showDashboard(interaction, true);
        
        if (id.startsWith('ar:act:')) {
            const [, , type, ruleId] = id.split(':');
            if (type === 'add_reply') return this.showReplyModal(interaction, ruleId);
            if (type === 'pop_reply') return this.popReply(interaction, ruleId);
            if (type === 'status') return this.toggleStatus(interaction, ruleId);
            if (type === 'delete') return this.deleteTrigger(interaction, ruleId);
        }
    }

    async handleSelect(interaction) {
        const id = interaction.customId;
        if (id === 'ar:select') {
            const ruleId = interaction.values[0];
            return this.showTriggerDetails(interaction, ruleId);
        }
    }

    async handleModal(interaction) {
        const id = interaction.customId;

        if (id === 'modal:ar:new') {
            const trigger = interaction.fields.getTextInputValue('ar_trigger');
            const matchType = interaction.fields.getTextInputValue('ar_match').toLowerCase();

            const validMatch = ['exact', 'contains'].includes(matchType) ? matchType : 'contains';

            const newRule = new AutoResponse({
                guildId: interaction.guildId,
                trigger,
                matchType: validMatch,
                responses: [],
                enabled: true
            });

            await newRule.save();
            await autoResponseManager.reloadGuild(interaction.guildId);
            return this.showTriggerDetails(interaction, newRule._id.toString(), true);
        }

        if (id.startsWith('modal:ar:reply:')) {
            const ruleId = id.split(':')[3];
            const replyText = interaction.fields.getTextInputValue('ar_reply_text');
            
            await AutoResponse.findByIdAndUpdate(ruleId, { $push: { responses: replyText } });
            await autoResponseManager.reloadGuild(interaction.guildId);
            
            return this.showTriggerDetails(interaction, ruleId, true);
        }
    }

    // ==========================================
    // UI Renderers
    // ==========================================

    async showDashboard(interaction, isUpdate = false) {
        const rules = await AutoResponse.find({ guildId: interaction.guildId });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('💬 Central de Auto-Respostas')
            .setDescription(`Gerencie gatilhos e respostas dinâmicas.\nO bot escolherá **aleatoriamente** uma resposta cadastrada para o gatilho detectado!\n\n**Gatilhos Ativos:** ${rules.filter(r => r.enabled).length}/${rules.length}`)
            .setFooter(tengokuFooter());

        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ar:new').setLabel('➕ Novo Gatilho').setStyle(ButtonStyle.Success)
            )
        ];

        if (rules.length > 0) {
            const options = rules.map(r => ({
                label: `"${r.trigger}"`,
                description: `${r.enabled ? '🟢' : '🔴'} | Tipo: ${r.matchType} | Respostas: ${r.responses.length}`,
                value: r._id.toString()
            })).slice(0, 25);

            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('ar:select').setPlaceholder('Selecione um gatilho para editar...').addOptions(options)
            ));
        }

        if (isUpdate) {
            await interaction.update({ embeds: [embed], components, ephemeral: true });
        } else {
            await interaction.editReply({ embeds: [embed], components });
        }
    }

    async showTriggerDetails(interaction, ruleId, isModalResponse = false) {
        const rule = await AutoResponse.findById(ruleId);
        if (!rule) {
            const msg = { content: '❌ Gatilho não encontrado.', embeds: [], components: [], flags: 64 };
            return isModalResponse ? interaction.reply(msg) : interaction.update(msg);
        }

        const embed = new EmbedBuilder()
            .setColor(rule.enabled ? PALETTE.success : PALETTE.secondary)
            .setTitle(`Gatilho: "${rule.trigger}"`)
            .setDescription(`**Tipo de Match:** \`${rule.matchType}\`\n**Status:** ${rule.enabled ? '🟢 Ativo' : '🔴 Inativo'}`)
            .addFields({ name: 'Respostas Cadastradas', value: rule.responses.length > 0 ? `\`${rule.responses.length}\` respostas no banco. O bot enviará uma delas aleatoriamente a cada trigger.` : 'Nenhuma resposta cadastrada ainda. **O gatilho não funcionará!**' })
            .setFooter(tengokuFooter());

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ar:act:add_reply:${rule._id}`).setLabel('Adicionar Resposta').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`ar:act:pop_reply:${rule._id}`).setLabel('Remover Última').setStyle(ButtonStyle.Danger).setDisabled(rule.responses.length === 0),
            new ButtonBuilder().setCustomId(`ar:act:status:${rule._id}`).setLabel(rule.enabled ? 'Desativar' : 'Ativar').setStyle(rule.enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`ar:act:delete:${rule._id}`).setLabel('Apagar Tudo').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ar:list').setLabel('Voltar').setStyle(ButtonStyle.Secondary)
        );

        const replyObj = { embeds: [embed], components: [row], ephemeral: true };
        
        if (isModalResponse) {
            await interaction.reply(replyObj);
        } else {
            await interaction.update(replyObj);
        }
    }

    async toggleStatus(interaction, ruleId) {
        const rule = await AutoResponse.findById(ruleId);
        rule.enabled = !rule.enabled;
        await rule.save();
        await autoResponseManager.reloadGuild(interaction.guildId);
        return this.showTriggerDetails(interaction, ruleId);
    }

    async popReply(interaction, ruleId) {
        await AutoResponse.findByIdAndUpdate(ruleId, { $pop: { responses: 1 } });
        await autoResponseManager.reloadGuild(interaction.guildId);
        return this.showTriggerDetails(interaction, ruleId);
    }

    async deleteTrigger(interaction, ruleId) {
        await AutoResponse.findByIdAndDelete(ruleId);
        await autoResponseManager.reloadGuild(interaction.guildId);
        return this.showDashboard(interaction, true);
    }

    // ==========================================
    // Modals
    // ==========================================

    async showNewTriggerModal(interaction) {
        const modal = new ModalBuilder().setCustomId('modal:ar:new').setTitle('Criar Auto-Resposta');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('ar_trigger').setLabel('Palavra Gatilho (ex: ping, ip do server)').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('ar_match').setLabel('Tipo (digite "exact" ou "contains")').setStyle(TextInputStyle.Short).setRequired(true).setValue('contains')
            )
        );

        await interaction.showModal(modal);
    }

    async showReplyModal(interaction, ruleId) {
        const modal = new ModalBuilder().setCustomId(`modal:ar:reply:${ruleId}`).setTitle('Adicionar Resposta');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('ar_reply_text')
                    .setLabel('O que o bot irá responder?')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setPlaceholder('Ex: O IP do servidor é jogar.server.com! (Você pode usar a tag {user} p/ mencionar)')
            )
        );

        await interaction.showModal(modal);
    }
}

module.exports = new AutoResponseHandler();
