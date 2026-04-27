// src/events/interaction/modHandler.js
// ============================================================
//   Tengoku Community Bot — Handler de Configuração de Moderação
// ============================================================

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');

async function guildColor(guildId) {
    const branding = await brandingManager.get(guildId);
    return branding.accent || PALETTE.accent;
}

// ═══════════════════════════════════════════════════════════════
//   PAINEL DE MODERAÇÃO
// ═══════════════════════════════════════════════════════════════
async function showModConfig(interaction) {
    const guildId = interaction.guildId;
    let guildDoc = await Guild.findOne({ guildId });
    if (!guildDoc) guildDoc = await Guild.create({ guildId });
    const cfg = guildDoc.modConfig || {};
    const color = await guildColor(guildId);

    const status = (val) => val ? '✅' : '❌';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🛡️ Configuração — Moderação & Proteção')
        .setDescription('Configure os sistemas de proteção automática do servidor.')
        .addFields(
            {
                name: '📋 Canal de Logs',
                value: cfg.logChannel ? `<#${cfg.logChannel}>` : '`Não configurado`',
                inline: false,
            },
            {
                name: '🔒 Anti-sistemas',
                value: [
                    `${status(cfg.antiSpam)} **Anti-Spam** — Limite: ${cfg.spamThresholdMsgs || 5} msgs em ${cfg.spamThresholdTime || 5000}ms`,
                    `${status(cfg.antiInvite)} **Anti-Invite** — Bloqueia convites externos`,
                    `${status(cfg.antiMassMention)} **Anti-Menção em Massa** — Máx: ${cfg.maxUserMentions || 5} usuários / ${cfg.maxRoleMentions || 3} cargos`,
                    `${status(cfg.antiEveryone)} **Anti-Everyone/Here** — Bloqueia @everyone e @here`,
                    `${status(cfg.antiLinks)} **Anti-Links** — Bloqueia links externos`,
                    `${status(cfg.antiCaps)} **Anti-Caps** — Bloqueia mensagens com ${cfg.capsThreshold || 70}%+ maiúsculas`,
                ].join('\n'),
                inline: false,
            },
            {
                name: '⚙️ Ações Automáticas',
                value: [
                    `Spam: \`${cfg.spamAction || 'delete'}\``,
                    `Invite: \`${cfg.inviteAction || 'delete'}\``,
                    `Menção: \`${cfg.mentionAction || 'delete'}\``,
                ].join(' | '),
                inline: false,
            },
            {
                name: '🔔 Notificações & Staff',
                value: [
                    `${status(cfg.notifyDm)} **Notificar via DM** — Avisar o usuário ao ser punido`,
                    `${status(cfg.hideStaff)} **Ocultar Staff** — Assinar punições apenas como "Moderação"`,
                ].join('\n'),
                inline: false,
            },
            {
                name: '⚪ Whitelists',
                value: 'Usuários, cargos, canais e webhooks isentos das verificações.',
                inline: false,
            },
        )
        .setFooter(tengokuFooter())
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:mod:set_log').setLabel('📋 Canal de Logs').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:mod:toggle_spam').setLabel(`${status(cfg.antiSpam)} Anti-Spam`).setStyle(cfg.antiSpam ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:mod:toggle_invite').setLabel(`${status(cfg.antiInvite)} Anti-Invite`).setStyle(cfg.antiInvite ? ButtonStyle.Danger : ButtonStyle.Success),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:mod:toggle_mention').setLabel(`${status(cfg.antiMassMention)} Anti-Menção`).setStyle(cfg.antiMassMention ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:mod:toggle_everyone').setLabel(`${status(cfg.antiEveryone)} Anti-Everyone`).setStyle(cfg.antiEveryone ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:mod:toggle_links').setLabel(`${status(cfg.antiLinks)} Anti-Links`).setStyle(cfg.antiLinks ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:mod:toggle_caps').setLabel(`${status(cfg.antiCaps)} Anti-Caps`).setStyle(cfg.antiCaps ? ButtonStyle.Danger : ButtonStyle.Success),
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:mod:set_limits').setLabel('⚙️ Limites').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:mod:set_actions').setLabel('⚡ Ações Automáticas').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:mod:whitelist').setLabel('⚪ Whitelists').setStyle(ButtonStyle.Secondary),
    );
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:mod:toggle_dm').setLabel(`${status(cfg.notifyDm)} Notificar DM`).setStyle(cfg.notifyDm ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:mod:toggle_hide').setLabel(`${status(cfg.hideStaff)} Ocultar Staff`).setStyle(cfg.hideStaff ? ButtonStyle.Danger : ButtonStyle.Success),
    );
    
    function backButton() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cfg:back_main')
                .setLabel('← Voltar ao Menu')
                .setStyle(ButtonStyle.Secondary)
        );
    }

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   PAINEL DE WHITELIST
// ═══════════════════════════════════════════════════════════════
async function showWhitelist(interaction) {
    const guildId = interaction.guildId;
    let guildDoc = await Guild.findOne({ guildId });
    if (!guildDoc) guildDoc = await Guild.create({ guildId });
    const cfg = guildDoc.modConfig || {};
    const color = await guildColor(guildId);

    const users = cfg.whitelistUsers || [];
    const roles = cfg.whitelistRoles || [];
    const channels = cfg.whitelistChannels || [];
    const links = cfg.whitelistLinks || [];

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('⚪ Configuração — Whitelists de Moderação')
        .setDescription('Entidades na whitelist são isentas de todas as verificações dos anti-sistemas.')
        .addFields(
            { name: `👤 Usuários (${users.length})`, value: users.length ? users.map(u => `<@${u}>`).join(', ') : '`Nenhum`', inline: false },
            { name: `🎭 Cargos (${roles.length})`, value: roles.length ? roles.map(r => `<@&${r}>`).join(', ') : '`Nenhum`', inline: false },
            { name: `📢 Canais (${channels.length})`, value: channels.length ? channels.map(c => `<#${c}>`).join(', ') : '`Nenhum`', inline: false },
            { name: `🔗 Links Permitidos (${links.length})`, value: links.length ? links.join(', ') : '`Nenhum`', inline: false },
        )
        .setFooter(tengokuFooter('Para adicionar, informe os IDs separados por vírgula'))
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:mod:wl_users').setLabel('👤 Usuários').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:mod:wl_roles').setLabel('🎭 Cargos').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:mod:wl_channels').setLabel('📢 Canais').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:mod:wl_links').setLabel('🔗 Links').setStyle(ButtonStyle.Secondary),
    );
    const backToMod = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:mod:back').setLabel('← Voltar à Moderação').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row, backToMod] });
}

// ═══════════════════════════════════════════════════════════════
//   HANDLER DE BOTÕES DE MODERAÇÃO
// ═══════════════════════════════════════════════════════════════
async function handleModButton(interaction) {
    const id = interaction.customId;
    const guildId = interaction.guildId;

    if (id === 'cfg:mod:back') return showModConfig(interaction);

    const toggleField = async (field) => {
        let doc = await Guild.findOne({ guildId });
        if (!doc) doc = await Guild.create({ guildId });
        const current = doc.modConfig[field];
        doc.modConfig[field] = !current;
        await doc.save();
        return !current;
    };

    if (id === 'cfg:mod:toggle_spam') {
        const val = await toggleField('antiSpam');
        return interaction.reply({ content: `✅ Anti-Spam ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
    }
    if (id === 'cfg:mod:toggle_invite') {
        const val = await toggleField('antiInvite');
        return interaction.reply({ content: `✅ Anti-Invite ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
    }
    if (id === 'cfg:mod:toggle_mention') {
        const val = await toggleField('antiMassMention');
        return interaction.reply({ content: `✅ Anti-Menção em Massa ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
    }
    if (id === 'cfg:mod:toggle_everyone') {
        const val = await toggleField('antiEveryone');
        return interaction.reply({ content: `✅ Anti-Everyone ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
    }
    if (id === 'cfg:mod:toggle_links') {
        const val = await toggleField('antiLinks');
        return interaction.reply({ content: `✅ Anti-Links ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
    }
    if (id === 'cfg:mod:toggle_caps') {
        const val = await toggleField('antiCaps');
        return interaction.reply({ content: `✅ Anti-Caps ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
    }
    if (id === 'cfg:mod:toggle_dm') {
        const val = await toggleField('notifyDm');
        return interaction.reply({ content: `✅ Notificações via DM ${val ? 'ativadas' : 'desativadas'}.`, flags: 64 });
    }
    if (id === 'cfg:mod:toggle_hide') {
        const val = await toggleField('hideStaff');
        return interaction.reply({ content: `✅ Ocultar Staff ${val ? 'ativado (Staff anônima)' : 'desativado (Staff visível)'}.`, flags: 64 });
    }

    if (id === 'cfg:mod:set_log') {
        const modal = new ModalBuilder().setCustomId('modal:mod:log').setTitle('Canal de Logs de Moderação');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('mod_log_channel').setLabel('ID do Canal de Logs').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('123456789012345678')
        ));
        return interaction.showModal(modal);
    }

    if (id === 'cfg:mod:set_limits') {
        const modal = new ModalBuilder().setCustomId('modal:mod:limits').setTitle('Limites de Proteção');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('max_user_mentions').setLabel('Máx. menções de usuário por mensagem').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('5')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('max_role_mentions').setLabel('Máx. menções de cargo por mensagem').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('3')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('spam_msgs').setLabel('Mensagens para detectar spam').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('5')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('spam_time').setLabel('Janela de tempo para spam (ms)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('5000')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('caps_threshold').setLabel('% de maiúsculas para Anti-Caps (0-100)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('70')),
        );
        return interaction.showModal(modal);
    }

    if (id === 'cfg:mod:set_actions') {
        const modal = new ModalBuilder().setCustomId('modal:mod:actions').setTitle('Ações Automáticas');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('spam_action').setLabel('Ação para Spam (delete/warn/mute/kick/ban)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('delete')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('invite_action').setLabel('Ação para Invite (delete/warn/kick/ban)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('delete')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mention_action').setLabel('Ação para Menção em Massa (delete/warn/mute)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('delete')),
        );
        return interaction.showModal(modal);
    }

    if (id === 'cfg:mod:whitelist') return showWhitelist(interaction);

    // Whitelist modals
    const wlMap = {
        'cfg:mod:wl_users': { id: 'modal:mod:wl_users', title: 'Whitelist: Usuários', label: 'IDs dos Usuários (separados por vírgula)', field: 'wl_input' },
        'cfg:mod:wl_roles': { id: 'modal:mod:wl_roles', title: 'Whitelist: Cargos', label: 'IDs dos Cargos (separados por vírgula)', field: 'wl_input' },
        'cfg:mod:wl_channels': { id: 'modal:mod:wl_channels', title: 'Whitelist: Canais', label: 'IDs dos Canais (separados por vírgula)', field: 'wl_input' },
        'cfg:mod:wl_links': { id: 'modal:mod:wl_links', title: 'Links Permitidos', label: 'Domínios permitidos (ex: youtube.com)', field: 'wl_input' },
    };
    if (wlMap[id]) {
        const data = wlMap[id];
        const modal = new ModalBuilder().setCustomId(data.id).setTitle(data.title);
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId(data.field).setLabel(data.label).setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('Deixe vazio para limpar a lista')
        ));
        return interaction.showModal(modal);
    }
}

// ═══════════════════════════════════════════════════════════════
//   HANDLER DE MODAIS DE MODERAÇÃO
// ═══════════════════════════════════════════════════════════════
async function handleModModal(interaction) {
    const { customId, fields, guildId } = interaction;

    const updateModConfig = async (updateData) => {
        let doc = await Guild.findOne({ guildId });
        if (!doc) doc = await Guild.create({ guildId });
        Object.assign(doc.modConfig, updateData);
        await doc.save();
    };

    if (customId === 'modal:mod:log') {
        const channel = fields.getTextInputValue('mod_log_channel');
        await updateModConfig({ logChannel: channel });
        return interaction.reply({ content: `✅ Canal de logs definido para <#${channel}>.`, flags: 64 });
    }

    if (customId === 'modal:mod:limits') {
        const maxUser = parseInt(fields.getTextInputValue('max_user_mentions'));
        const maxRole = parseInt(fields.getTextInputValue('max_role_mentions'));
        const spamMsgs = parseInt(fields.getTextInputValue('spam_msgs'));
        const spamTime = parseInt(fields.getTextInputValue('spam_time'));
        const caps = parseInt(fields.getTextInputValue('caps_threshold'));

        if ([maxUser, maxRole, spamMsgs, spamTime, caps].some(isNaN)) {
            return interaction.reply({ content: '❌ Valores inválidos. Use apenas números.', flags: 64 });
        }
        await updateModConfig({
            maxUserMentions: maxUser,
            maxRoleMentions: maxRole,
            spamThresholdMsgs: spamMsgs,
            spamThresholdTime: spamTime,
            capsThreshold: caps,
        });
        return interaction.reply({ content: '✅ Limites de proteção atualizados!', flags: 64 });
    }

    if (customId === 'modal:mod:actions') {
        const validActions = ['delete', 'warn', 'mute', 'kick', 'ban'];
        const spamAction = fields.getTextInputValue('spam_action').toLowerCase();
        const inviteAction = fields.getTextInputValue('invite_action').toLowerCase();
        const mentionAction = fields.getTextInputValue('mention_action').toLowerCase();

        if (![spamAction, inviteAction, mentionAction].every(a => validActions.includes(a))) {
            return interaction.reply({ content: `❌ Ação inválida. Use: ${validActions.join(', ')}`, flags: 64 });
        }
        await updateModConfig({
            spamAction: spamAction,
            inviteAction: inviteAction,
            mentionAction: mentionAction,
        });
        return interaction.reply({ content: '✅ Ações automáticas atualizadas!', flags: 64 });
    }

    // Whitelists
    const wlFields = {
        'modal:mod:wl_users': 'whitelistUsers',
        'modal:mod:wl_roles': 'whitelistRoles',
        'modal:mod:wl_channels': 'whitelistChannels',
        'modal:mod:wl_links': 'whitelistLinks',
    };
    
    if (wlFields[customId]) {
        const raw = fields.getTextInputValue('wl_input');
        const list = raw ? raw.split(',').map(i => i.trim()).filter(Boolean) : [];
        await updateModConfig({ [wlFields[customId]]: list });
        return interaction.reply({ content: `✅ Whitelist atualizada com ${list.length} entradas.`, flags: 64 });
    }
}

module.exports = { showModConfig, showWhitelist, handleModButton, handleModModal };
