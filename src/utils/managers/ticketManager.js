const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
} = require('discord.js');
const TicketPanel = require('@models/TicketPanel');
const Ticket = require('@models/Ticket');
const TicketTranscript = require('@models/TicketTranscript');
const ticketPermissionService = require('@services/ticketPermissionService');
const transcriptService = require('@services/transcriptService');
const { buildTicketActions, buildTicketEmbed } = require('@utils/ticketComponents');
const logger = require('@utils/logger');

function createTicketId() {
    return `ticket_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function formatTemplate(template, values) {
    return String(template || '').replace(/\{(.*?)\}/g, (_, key) => values[key] ?? '');
}

function isStaff(member, staffRoleIds) {
    if (!staffRoleIds?.length) return false;
    return staffRoleIds.some(roleId => member.roles.cache.has(roleId));
}

function trimValue(value) {
    return value?.trim?.() || '';
}

class TicketManager {
    async handleInteraction(interaction) {
        const customId = interaction.customId;
        if (!customId || !customId.startsWith('ticket:')) return false;

        const [, action, first, second] = customId.split(':');

        switch (action) {
            case 'open': return this.handleOpen(interaction, first, second);
            case 'select': return this.handleSelect(interaction, first);
            case 'modal': return this.handleModalSubmit(interaction, first, second);
            case 'claim': return this.claimTicket(interaction, first);
            case 'close': return this.closeTicket(interaction, first);
            case 'close_confirm': return this.confirmCloseTicket(interaction, first);
            case 'close_cancel': return this.cancelAction(interaction);
            case 'reopen': return this.reopenTicket(interaction, first);
            case 'delete': return this.deleteTicket(interaction, first);
            case 'delete_confirm': return this.confirmDeleteTicket(interaction, first);
            case 'delete_cancel': return this.cancelAction(interaction);
            default:
                return interaction.reply({ content: '❌ Interação de ticket não reconhecida.', flags: 64 });
        }
    }

    async handleOpen(interaction, panelId, optionId) {
        const panel = await this.findPanel(interaction.guildId, panelId);
        if (!panel) {
            return interaction.reply({ content: '❌ Painel de ticket não encontrado.', flags: 64 });
        }

        const option = this.findOption(panel, optionId);
        if (!option) {
            return interaction.reply({ content: '❌ Opção de ticket inválida.', flags: 64 });
        }

        if (panel.maxOpenTicketsPerUser > 0) {
            const count = await Ticket.countDocuments({ guildId: interaction.guildId, ownerId: interaction.user.id, status: 'open' });
            if (count >= panel.maxOpenTicketsPerUser) {
                return interaction.reply({ content: `❌ Você já possui ${count} ticket(s) abertos. Feche um ticket antes de abrir outro.`, flags: 64 });
            }
        }

        if (option.form?.length > 0) {
            if (option.form.length > 5) {
                return interaction.reply({ content: '❌ Este formulário excede o limite de 5 campos do Discord. Ajuste a configuração do painel.', flags: 64 });
            }
            return this.openTicketForm(interaction, panel, option);
        }

        return this.createTicket(interaction, panel, option, []);
    }

    async handleSelect(interaction, panelId) {
        const panel = await this.findPanel(interaction.guildId, panelId);
        if (!panel) {
            return interaction.reply({ content: '❌ Painel de ticket não encontrado.', flags: 64 });
        }

        const optionId = interaction.values?.[0];
        const option = this.findOption(panel, optionId);
        if (!option) {
            return interaction.reply({ content: '❌ Opção de ticket inválida.', flags: 64 });
        }

        if (panel.maxOpenTicketsPerUser > 0) {
            const count = await Ticket.countDocuments({ guildId: interaction.guildId, ownerId: interaction.user.id, status: 'open' });
            if (count >= panel.maxOpenTicketsPerUser) {
                return interaction.reply({ content: `❌ Você já possui ${count} ticket(s) abertos. Feche um ticket antes de abrir outro.`, flags: 64 });
            }
        }

        if (option.form?.length > 0) {
            if (option.form.length > 5) {
                return interaction.reply({ content: '❌ Este formulário excede o limite de 5 campos do Discord. Ajuste a configuração do painel.', flags: 64 });
            }
            return this.openTicketForm(interaction, panel, option);
        }

        return this.createTicket(interaction, panel, option, []);
    }

    async handleModalSubmit(interaction, panelId, optionId) {
        const panel = await this.findPanel(interaction.guildId, panelId);
        if (!panel) {
            return interaction.reply({ content: '❌ Painel de ticket não encontrado.', flags: 64 });
        }

        const option = this.findOption(panel, optionId);
        if (!option) {
            return interaction.reply({ content: '❌ Opção de ticket inválida.', flags: 64 });
        }

        const answers = option.form.map(field => ({
            fieldId: field.fieldId,
            label: field.label,
            value: trimValue(interaction.fields.getTextInputValue(field.fieldId)),
            required: field.required,
        }));

        return this.createTicket(interaction, panel, option, answers);
    }

    async openTicketForm(interaction, panel, option) {
        const modal = new ModalBuilder()
            .setCustomId(`ticket:modal:${panel.panelId}:${option.optionId}`)
            .setTitle(option.label || 'Abrir Ticket');

        const rows = option.form.map(field => {
            const input = new TextInputBuilder()
                .setCustomId(field.fieldId)
                .setLabel(field.label)
                .setStyle(field.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(field.required)
                .setPlaceholder(field.placeholder || null);

            if (Number.isInteger(field.minLength)) input.setMinLength(field.minLength);
            if (Number.isInteger(field.maxLength)) input.setMaxLength(field.maxLength);

            return new ActionRowBuilder().addComponents(input);
        });

        await interaction.showModal({ components: rows, ...modal.toJSON() });
    }

    async createTicket(interaction, panel, option, answers) {
        const guild = interaction.guild;
        if (!guild) return interaction.reply({ content: '❌ Guild não disponível.', flags: 64 });

        const ticketId = createTicketId();
        const ticketNumber = await Ticket.countDocuments({ guildId: panel.guildId }) + 1;
        const variables = {
            'username': interaction.user.username,
            'user.id': interaction.user.id,
            'user.tag': interaction.user.tag,
            'ticket.id': ticketId,
            'ticket.number': ticketNumber,
            'option.label': option.label,
            'panel.name': panel.name,
        };

        const channelName = formatTemplate(option.ticketNameFormat || 'ticket-{username}-{ticket.id}', variables)
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 90) || `ticket-${interaction.user.username}`;

        const categoryId = option.categoryId || panel.ticketCategoryId;
        const parent = categoryId ? { parent: categoryId } : {};
        const topic = option.channelTopicFormat ? formatTemplate(option.channelTopicFormat, variables) : '';

        const staffRoleIds = option.staffRoleIds?.length ? option.staffRoleIds : panel.staffRoleIds;
        const overwrites = ticketPermissionService.buildOpenTicketOverwrites(guild.id, interaction.user.id, staffRoleIds, interaction.client.user.id);

        let createdChannel;
        try {
            createdChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic,
                permissionOverwrites: overwrites,
                ...parent,
            });
        } catch (err) {
            logger.error(`Erro ao criar canal de ticket: ${err.message}`);
            return interaction.reply({ content: '❌ Falha ao criar o canal do ticket. Verifique permissões do bot.', flags: 64 });
        }

        const ticketDoc = await Ticket.create({
            guildId: panel.guildId,
            ticketId,
            ticketNumber,
            panelId: panel.panelId,
            optionId: option.optionId,
            channelId: createdChannel.id,
            ownerId: interaction.user.id,
            status: 'open',
            staffRoleIds,
            formAnswers: answers,
        });

        const ticketEmbed = buildTicketEmbed(ticketDoc, panel, option);
        const actionRows = buildTicketActions(ticketDoc);

        try {
            const ticketMessage = await createdChannel.send({ embeds: [ticketEmbed], components: actionRows });
            ticketDoc.ticketMessageId = ticketMessage.id;
            await ticketDoc.save();
        } catch (err) {
            logger.error(`Erro ao enviar embed do ticket: ${err.message}`);
        }

        if (option.welcomeMessage?.content || option.welcomeMessage?.embed) {
            const payload = {};
            if (option.welcomeMessage.content) payload.content = option.welcomeMessage.content;
            if (option.welcomeMessage.embed) payload.embeds = [new EmbedBuilder(option.welcomeMessage.embed)];
            await createdChannel.send(payload).catch(() => null);
        }

        const replyEmbed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('✅ Ticket aberto')
            .setDescription(`Seu ticket foi criado em <#${createdChannel.id}>.`)
            .setFooter({ text: 'Use os botões no canal do ticket para gerenciar o atendimento.' });

        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        await this.sendLog(panel, ticketDoc, guild, 'ticket_created', interaction.user.id, `Ticket criado em <#${createdChannel.id}>.`);
    }

    async claimTicket(interaction, ticketId) {
        const ticket = await this.fetchTicket(interaction.guildId, ticketId);
        if (!ticket) {
            return interaction.reply({ content: '❌ Ticket não encontrado.', flags: 64 });
        }
        if (ticket.status !== 'open') {
            return interaction.reply({ content: '❌ Só é possível reivindicar tickets abertos.', flags: 64 });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!isStaff(member, ticket.staffRoleIds) && !member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ Você não tem permissão de staff para reivindicar este ticket.', flags: 64 });
        }

        if (ticket.claimedById && ticket.claimedById !== interaction.user.id) {
            return interaction.reply({ content: '❌ Este ticket já foi reivindicado por outra pessoa.', flags: 64 });
        }

        ticket.claimedById = interaction.user.id;
        await ticket.save();

        await this.updateTicketMessage(ticket, interaction.guild);
        await interaction.reply({ content: `✅ Ticket reivindicado por <@${interaction.user.id}>.`, flags: 64 });
        await this.sendLog(null, ticket, interaction.guild, 'ticket_claimed', interaction.user.id, `Ticket reivindicado.`);
    }

    async closeTicket(interaction, ticketId) {
        const ticket = await this.fetchTicket(interaction.guildId, ticketId);
        if (!ticket) {
            return interaction.reply({ content: '❌ Ticket não encontrado.', flags: 64 });
        }
        if (ticket.status !== 'open') {
            return interaction.reply({ content: '❌ Este ticket já foi fechado ou deletado.', flags: 64 });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket:close_confirm:${ticketId}`)
                .setLabel('Confirmar fechamento')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`ticket:close_cancel:${ticketId}`)
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary),
        );

        return interaction.reply({ content: '⚠️ Tem certeza que deseja fechar este ticket?', components: [row], ephemeral: true });
    }

    async confirmCloseTicket(interaction, ticketId) {
        const ticket = await this.fetchTicket(interaction.guildId, ticketId);
        if (!ticket) {
            return interaction.reply({ content: '❌ Ticket não encontrado.', flags: 64 });
        }
        if (ticket.status !== 'open') {
            return interaction.reply({ content: '❌ Este ticket não está aberto.', flags: 64 });
        }

        const panel = await this.findPanel(interaction.guildId, ticket.panelId);
        const option = panel ? this.findOption(panel, ticket.optionId) : null;
        const channel = await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);
        if (channel) {
            const overwrites = ticketPermissionService.buildClosedTicketOverwrites(interaction.guild.id, ticket.ownerId, ticket.staffRoleIds, interaction.client.user.id);
            await channel.permissionOverwrites.set(overwrites).catch(() => null);
            if (panel?.closedTicketCategoryId) {
                await channel.setParent(panel.closedTicketCategoryId).catch(() => null);
            }
        }

        ticket.status = 'closed';
        ticket.closedById = interaction.user.id;
        ticket.closedAt = new Date();
        await ticket.save();

        await this.updateTicketMessage(ticket, interaction.guild, panel, option);
        await interaction.reply({ content: '✅ Ticket fechado com sucesso.', flags: 64 });
        await this.sendLog(panel, ticket, interaction.guild, 'ticket_closed', interaction.user.id, 'Ticket fechado.');

        if (channel && panel?.transcriptChannelId) {
            const transcriptAttachment = await transcriptService.generateTicketTranscript(channel);
            const transcriptChannel = await interaction.guild.channels.fetch(panel.transcriptChannelId).catch(() => null);
            if (transcriptChannel?.isTextBased()) {
                const transcriptMessage = await transcriptChannel.send({ content: `📄 Transcript do ticket ${ticket.ticketId}`, files: [transcriptAttachment] }).catch(() => null);
                if (transcriptMessage) {
                    ticket.transcriptMessageId = transcriptMessage.id;
                    ticket.transcriptUrl = transcriptMessage.url;
                    await ticket.save();
                    await TicketTranscript.findOneAndUpdate(
                        { guildId: ticket.guildId, ticketId: ticket.ticketId },
                        { transcriptUrl: transcriptMessage.url, transcriptMessageId: transcriptMessage.id, filename: transcriptAttachment.name },
                        { upsert: true }
                    );
                }
            }
        }
    }

    async reopenTicket(interaction, ticketId) {
        const ticket = await this.fetchTicket(interaction.guildId, ticketId);
        if (!ticket) {
            return interaction.reply({ content: '❌ Ticket não encontrado.', flags: 64 });
        }
        if (ticket.status !== 'closed') {
            return interaction.reply({ content: '❌ Só é possível reabrir tickets fechados.', flags: 64 });
        }

        const panel = await this.findPanel(interaction.guildId, ticket.panelId);
        const channel = await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);
        if (channel) {
            const overwrites = ticketPermissionService.buildOpenTicketOverwrites(interaction.guild.id, ticket.ownerId, ticket.staffRoleIds, interaction.client.user.id);
            await channel.permissionOverwrites.set(overwrites).catch(() => null);
            if (panel?.ticketCategoryId) {
                await channel.setParent(panel.ticketCategoryId).catch(() => null);
            }
        }

        ticket.status = 'open';
        ticket.reopenedById = interaction.user.id;
        ticket.reopenedAt = new Date();
        await ticket.save();

        const option = panel ? this.findOption(panel, ticket.optionId) : null;
        await this.updateTicketMessage(ticket, interaction.guild, panel, option);
        await interaction.reply({ content: '✅ Ticket reaberto com sucesso.', flags: 64 });
        await this.sendLog(panel, ticket, interaction.guild, 'ticket_reopened', interaction.user.id, 'Ticket reaberto.');
    }

    async deleteTicket(interaction, ticketId) {
        const ticket = await this.fetchTicket(interaction.guildId, ticketId);
        if (!ticket) {
            return interaction.reply({ content: '❌ Ticket não encontrado.', flags: 64 });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket:delete_confirm:${ticketId}`)
                .setLabel('Confirmar exclusão')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`ticket:delete_cancel:${ticketId}`)
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary),
        );

        return interaction.reply({ content: '⚠️ Tem certeza que deseja deletar este ticket? O canal será removido.', components: [row], ephemeral: true });
    }

    async confirmDeleteTicket(interaction, ticketId) {
        const ticket = await this.fetchTicket(interaction.guildId, ticketId);
        if (!ticket) {
            return interaction.reply({ content: '❌ Ticket não encontrado.', flags: 64 });
        }
        if (ticket.status === 'deleted') {
            return interaction.reply({ content: '❌ Este ticket já foi deletado.', flags: 64 });
        }

        const panel = await this.findPanel(interaction.guildId, ticket.panelId);
        const channel = await interaction.guild.channels.fetch(ticket.channelId).catch(() => null);

        if (channel && panel?.transcriptChannelId) {
            const transcriptAttachment = await transcriptService.generateTicketTranscript(channel);
            const transcriptChannel = await interaction.guild.channels.fetch(panel.transcriptChannelId).catch(() => null);
            if (transcriptChannel?.isTextBased()) {
                const transcriptMessage = await transcriptChannel.send({ content: `📄 Transcript final do ticket ${ticket.ticketId}`, files: [transcriptAttachment] }).catch(() => null);
                if (transcriptMessage) {
                    ticket.transcriptMessageId = transcriptMessage.id;
                    ticket.transcriptUrl = transcriptMessage.url;
                    await TicketTranscript.findOneAndUpdate(
                        { guildId: ticket.guildId, ticketId: ticket.ticketId },
                        { transcriptUrl: transcriptMessage.url, transcriptMessageId: transcriptMessage.id, filename: transcriptAttachment.name },
                        { upsert: true }
                    );
                }
            }
        }

        ticket.status = 'deleted';
        ticket.deletedById = interaction.user.id;
        ticket.deletedAt = new Date();
        await ticket.save();

        if (channel) {
            await channel.delete('Ticket deletado pelo staff').catch(() => null);
        }

        await interaction.reply({ content: '✅ Ticket deletado. O registro foi mantido no banco de dados.', flags: 64 });
        await this.sendLog(panel, ticket, interaction.guild, 'ticket_deleted', interaction.user.id, 'Ticket deletado.');
    }

    async cancelAction(interaction) {
        return interaction.reply({ content: '❌ Ação cancelada.', flags: 64 });
    }

    async updateTicketMessage(ticket, guild, panel = null, option = null) {
        if (!guild) return;
        const channel = guild.channels.cache.get(ticket.channelId) || await guild.channels.fetch(ticket.channelId).catch(() => null);
        if (!channel || !ticket.ticketMessageId) return;

        const message = await channel.messages.fetch(ticket.ticketMessageId).catch(() => null);
        if (!message) return;

        if (!panel) panel = await this.findPanel(ticket.guildId, ticket.panelId);
        if (!option && panel) option = this.findOption(panel, ticket.optionId);

        const embed = buildTicketEmbed(ticket, panel || { name: 'Ticket' }, option || { label: 'Ticket' });
        const components = buildTicketActions(ticket);
        await message.edit({ embeds: [embed], components }).catch(() => null);
    }

    async sendLog(panel, ticket, guild, event, actorId, description) {
        if (!panel?.logChannelId || !guild) return;
        const channel = await guild.channels.fetch(panel.logChannelId).catch(() => null);
        if (!channel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setColor(event === 'ticket_closed' || event === 'ticket_deleted' ? 0xF04747 : 0x57F287)
            .setTitle(description)
            .setDescription(`**Ticket:** ${ticket.ticketId}\n**Status:** ${ticket.status}\n**Painel:** ${ticket.panelId}`)
            .addFields(
                { name: 'Usuário', value: `<@${ticket.ownerId}>`, inline: true },
                { name: 'Ator', value: actorId ? `<@${actorId}>` : 'Sistema', inline: true },
                { name: 'Ação', value: event, inline: true },
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => null);
    }

    async fetchTicket(guildId, ticketId) {
        return Ticket.findOne({ guildId, ticketId });
    }

    async findPanel(guildId, panelId) {
        return TicketPanel.findOne({ guildId, panelId });
    }

    findOption(panel, optionId) {
        return panel.options?.find(option => option.optionId === optionId) || null;
    }
}

module.exports = new TicketManager();
