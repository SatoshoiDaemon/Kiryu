const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

const STYLE_MAP = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
};

function buildPanelComponents(panel) {
    if (panel.mode === 'select') {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`ticket:select:${panel.panelId}`)
            .setPlaceholder('Selecione uma opção de ticket...')
            .addOptions(
                panel.options.map(option => new StringSelectMenuOptionBuilder()
                    .setLabel(option.label)
                    .setValue(option.optionId)
                    .setDescription(option.description || 'Abrir este tipo de ticket')
                    .setEmoji(option.emoji || null)
                )
            );

        return [new ActionRowBuilder().addComponents(select)];
    }

    const rows = [];
    const chunks = [];
    const options = panel.options || [];
    for (let i = 0; i < options.length; i += 5) {
        chunks.push(options.slice(i, i + 5));
    }

    for (const chunk of chunks) {
        const row = new ActionRowBuilder();
        for (const option of chunk) {
            const button = new ButtonBuilder()
                .setCustomId(`ticket:open:${panel.panelId}:${option.optionId}`)
                .setLabel(option.label)
                .setStyle(STYLE_MAP[option.style] || ButtonStyle.Primary);

            if (option.emoji) button.setEmoji(option.emoji);
            row.addComponents(button);
        }
        rows.push(row);
    }

    return rows;
}

function buildTicketActions(ticket) {
    if (ticket.status === 'open') {
        return [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket:claim:${ticket.ticketId}`)
                .setLabel('Claim')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`ticket:close:${ticket.ticketId}`)
                .setLabel('Fechar')
                .setStyle(ButtonStyle.Danger),
        )];
    }

    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket:reopen:${ticket.ticketId}`)
            .setLabel('Reabrir')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`ticket:delete:${ticket.ticketId}`)
            .setLabel('Deletar')
            .setStyle(ButtonStyle.Danger),
    )];
}

function buildTicketEmbed(ticket, panel, option) {
    const embed = new EmbedBuilder()
        .setColor(PALETTE.accent)
        .setTitle(option?.label ? `🔖 Ticket — ${option.label}` : '🔖 Ticket')
        .setDescription(`**Ticket aberto por:** <@${ticket.ownerId}>\n**Painel:** ${panel.name}`)
        .addFields(
            { name: 'Status', value: ticket.status === 'open' ? '🟢 Aberto' : ticket.status === 'closed' ? '🔒 Fechado' : '🗑️ Deletado', inline: true },
            { name: 'Claim', value: ticket.claimedById ? `<@${ticket.claimedById}>` : 'Ninguém', inline: true },
            { name: 'Criado em', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: false },
        );

    if (ticket.formAnswers?.length) {
        embed.addFields({ name: 'Informações do formulário', value: ticket.formAnswers.map(answer => `**${answer.label}**\n${answer.value}`).join('\n\n'), inline: false });
    }

    if (ticket.closeReason) {
        embed.addFields({ name: 'Motivo do fechamento', value: ticket.closeReason, inline: false });
    }

    embed.setFooter(tengokuFooter());
    embed.setTimestamp();
    return embed;
}

function buildTicketWelcomeEmbed(panel, option, owner, answers) {
    const embed = new EmbedBuilder()
        .setColor(PALETTE.primary)
        .setTitle('🎫 Ticket criado com sucesso!')
        .setDescription(`Seu ticket foi aberto em <#${panel.channelId}>. A equipe de suporte já pode ver sua solicitação.`)
        .addFields(
            { name: 'Categoria', value: option.label, inline: true },
            { name: 'Autor', value: `${owner}`, inline: true },
            { name: 'Painel', value: panel.name, inline: true },
        )
        .setFooter(tengokuFooter())
        .setTimestamp();

    if (answers?.length) {
        embed.addFields({ name: 'Respostas do formulário', value: answers.map(answer => `**${answer.label}**\n${answer.value}`).join('\n\n') });
    }

    return embed;
}

module.exports = {
    buildPanelComponents,
    buildTicketActions,
    buildTicketEmbed,
    buildTicketWelcomeEmbed,
};
