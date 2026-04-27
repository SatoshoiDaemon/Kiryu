// src/events/interaction/configHandler.js
// ============================================================
//   Olympus Community Bot — Handler Central do /config
//   Gerencia todos os menus, botões e modais do painel
// ============================================================

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
} = require('discord.js');
const Guild = require('@models/Guild');
const XPRole = require('@models/XPRole');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');
const permissionsManager = require('@utils/managers/permissionsManager');
const logger = require('@utils/logger');

// ── Botão de voltar ao menu principal ────────────────────────
function backButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('cfg:back_main')
            .setLabel('← Voltar ao Menu')
            .setStyle(ButtonStyle.Secondary)
    );
}

// ── Helper: obter cor do servidor ────────────────────────────
async function guildColor(guildId) {
    const branding = await brandingManager.get(guildId);
    return branding.accent || PALETTE.accent;
}

// ── Helper: upsert genérico mongoose ─────────────────────────
async function upsertConfig(guildId, configKey, data) {
    let guildDoc = await Guild.findOne({ guildId });
    if (!guildDoc) guildDoc = await Guild.create({ guildId });

    if (!guildDoc[configKey]) guildDoc[configKey] = {};
    
    Object.assign(guildDoc[configKey], data);
    await guildDoc.save();
}

// ── Helper: toggle booleano mongoose ─────────────────────────
async function toggleConfigField(guildId, configKey, fieldName) {
    let guildDoc = await Guild.findOne({ guildId });
    if (!guildDoc) guildDoc = await Guild.create({ guildId });

    if (!guildDoc[configKey]) guildDoc[configKey] = {};

    const current = guildDoc[configKey][fieldName] || false;
    guildDoc[configKey][fieldName] = !current;
    await guildDoc.save();
    return !current;
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: MENU PRINCIPAL
// ═══════════════════════════════════════════════════════════════
async function showMain(interaction) {
    const branding = await brandingManager.get(interaction.guildId);
    // Reconstrói o embed principal
    const embed = new EmbedBuilder()
        .setColor(branding.accent || PALETTE.accent)
        .setTitle('⚙️ Painel de Configuração')
        .setDescription(
            '> Bem-vindo ao painel de configuração do **Olympus Bot**.\n' +
            '> Selecione uma categoria abaixo para configurar as funcionalidades do bot neste servidor.\n\n' +
            '**Categorias disponíveis:**\n' +
            '🤖 **IA** — Configurar o assistente de inteligência artificial\n' +
            '👋 **Boas-vindas** — Mensagens e cargos automáticos de entrada\n' +
            '💰 **Economia** — Moeda, daily, trabalho e roubo\n' +
            '⭐ **XP & Níveis** — Sistema de experiência e recompensas\n' +
            '🛡️ **Moderação** — Anti-spam, anti-invite, logs e proteções\n' +
            '🔑 **Permissões** — Controle granular de acesso aos comandos\n' +
            '🚀 **Sistemas** — Sugestões, parcerias, starboard e instafeed\n' +
            '🎨 **Aparência** — Cores, nome e identidade visual do bot'
        )
        .setFooter(olympusFooter('Use os menus abaixo para navegar'))
        .setTimestamp();

    const select = new StringSelectMenuBuilder()
        .setCustomId('cfg:main')
        .setPlaceholder('Selecione uma categoria...')
        .addOptions(
            { label: '🤖 Inteligência Artificial', description: 'Configurar o assistente de IA Gemini', value: 'cfg:ai' },
            { label: '👋 Boas-vindas', description: 'Mensagens e cargos automáticos de entrada', value: 'cfg:welcome' },
            { label: '💰 Economia', description: 'Moeda, daily, trabalho e roubo', value: 'cfg:economy' },
            { label: '⭐ XP & Níveis', description: 'Sistema de experiência e recompensas', value: 'cfg:xp' },
            { label: '🛡️ Moderação & Proteção', description: 'Anti-spam, anti-invite, logs e proteções', value: 'cfg:mod' },
            { label: '🔑 Permissões de Comandos', description: 'Controle granular de acesso por cargo/usuário', value: 'cfg:perms' },
            { label: '🚀 Sistemas Extras', description: 'Sugestões, parcerias, starboard e instafeed', value: 'cfg:systems' },
            { label: '🎨 Aparência', description: 'Cores, nome e identidade visual do bot', value: 'cfg:branding' },
        );

    await interaction.update({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(select)],
    });
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: IA
// ═══════════════════════════════════════════════════════════════
async function showAI(interaction) {
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId });
    const cfg = guildDoc?.aiConfig || {};
    const color = await guildColor(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🤖 Configuração — Inteligência Artificial')
        .setDescription('Configure o assistente de IA Gemini para este servidor.')
        .addFields(
            { name: 'Status', value: cfg.enabled ? '✅ Ativado' : '❌ Desativado', inline: true },
            { name: 'Canal de Resposta', value: cfg.responseChannel ? `<#${cfg.responseChannel}>` : '`Qualquer canal`', inline: true },
            { name: 'Apenas Menções', value: cfg.mentionOnly ? '✅ Sim' : '❌ Não', inline: true },
            { name: 'Memória de Conversa', value: cfg.keepMemory ? '✅ Ativada' : '❌ Desativada', inline: true },
            { name: 'Chave API', value: cfg.apiKey ? '`••••••••` (configurada)' : '`Não configurada`', inline: true },
            { name: 'Instrução do Sistema', value: cfg.systemInstruction ? `\`\`\`${cfg.systemInstruction.substring(0, 100)}...\`\`\`` : '`Padrão`', inline: false },
        )
        .setFooter(olympusFooter())
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:ai:toggle').setLabel(cfg.enabled ? 'Desativar IA' : 'Ativar IA').setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:ai:set_key').setLabel('Definir Chave API').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:ai:toggle_mention').setLabel(cfg.mentionOnly ? 'Responder Sempre' : 'Apenas Menções').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:ai:toggle_memory').setLabel(cfg.keepMemory ? 'Desativar Memória' : 'Ativar Memória').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:ai:set_instruction').setLabel('Instrução do Sistema').setStyle(ButtonStyle.Secondary),
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:ai_channel')
            .setPlaceholder('Selecione o canal de resposta...')
            .setChannelTypes(ChannelType.GuildText)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: BOAS-VINDAS
// ═══════════════════════════════════════════════════════════════
async function showWelcome(interaction) {
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId });
    const cfg = guildDoc?.welcomeConfig || {};
    const color = await guildColor(interaction.guildId);

    let rolesText = '`Nenhum`';
    if (cfg.initialRoles && cfg.initialRoles.length > 0) {
        rolesText = cfg.initialRoles.map(r => `<@&${r}>`).join(', ');
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('👋 Configuração — Boas-vindas')
        .setDescription('Configure as mensagens e ações automáticas ao entrar no servidor.')
        .addFields(
            { name: 'Status', value: cfg.enabled ? '✅ Ativado' : '❌ Desativado', inline: true },
            { name: 'Canal de Boas-vindas', value: cfg.welcomeChannel ? `<#${cfg.welcomeChannel}>` : '`Não configurado`', inline: true },
            { name: 'DM Automática', value: cfg.dmEnabled ? '✅ Ativada' : '❌ Desativada', inline: true },
            { name: 'Cargos Iniciais', value: rolesText, inline: false },
            { name: 'Mensagem no Canal', value: cfg.welcomeMsgChannel ? `\`\`\`${cfg.welcomeMsgChannel.substring(0, 150)}\`\`\`` : '`Padrão`', inline: false },
        )
        .setFooter(olympusFooter('Use {user} para mencionar, {server} para o nome do servidor'))
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:welcome:toggle').setLabel(cfg.enabled ? 'Desativar' : 'Ativar').setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:welcome:set_msg').setLabel('Mensagem do Canal').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:welcome:toggle_dm').setLabel(cfg.dmEnabled ? 'Desativar DM' : 'Ativar DM').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:welcome:set_dm_msg').setLabel('Mensagem da DM').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:welcome_channel')
            .setPlaceholder('Selecione o canal de boas-vindas...')
            .setChannelTypes(ChannelType.GuildText)
    );
    const row3 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('cfg:sel:welcome_roles')
            .setPlaceholder('Selecione o cargo inicial (auto-role)...')
            .setMinValues(1)
            .setMaxValues(5)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: ECONOMIA
// ═══════════════════════════════════════════════════════════════
async function showEconomy(interaction) {
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId });
    const defaults = {
        enabled: true, currencyName: 'moedas', currencySymbol: '🪙',
        dailyAmount: 100, workMin: 50, workMax: 200,
        workCooldown: 3600, robEnabled: true,
    };
    const cfg = guildDoc?.economyConfig || defaults;
    const color = await guildColor(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('💰 Configuração — Economia')
        .setDescription('Configure o sistema de economia do servidor.')
        .addFields(
            { name: 'Status', value: cfg.enabled ? '✅ Ativado' : '❌ Desativado', inline: true },
            { name: 'Moeda', value: `${cfg.currencySymbol} ${cfg.currencyName}`, inline: true },
            { name: 'Daily', value: `${cfg.dailyAmount} ${cfg.currencySymbol}`, inline: true },
            { name: 'Trabalho', value: `${cfg.workMin}–${cfg.workMax} ${cfg.currencySymbol} (CD: ${Math.floor(cfg.workCooldown / 60)}min)`, inline: true },
            { name: 'Roubo', value: cfg.robEnabled ? '✅ Ativado' : '❌ Desativado', inline: true },
        )
        .setFooter(olympusFooter())
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:economy:toggle').setLabel(cfg.enabled ? 'Desativar' : 'Ativar').setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:economy:set_currency').setLabel('Configurar Moeda').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:economy:set_daily').setLabel('Configurar Daily').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:economy:set_work').setLabel('Configurar Trabalho').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:economy:toggle_rob').setLabel(cfg.robEnabled ? 'Desativar Roubo' : 'Ativar Roubo').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:economy:shop').setLabel('🛒 Loja').setStyle(ButtonStyle.Primary),
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: XP & NÍVEIS
// ═══════════════════════════════════════════════════════════════
async function showXP(interaction) {
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId });
    const defaults = {
        enabled: true, minChatXp: 5, maxChatXp: 15,
        voiceXpRate: 2, cooldownSeconds: 60,
        notificationChannel: null,
    };
    const cfg = guildDoc?.xpConfig || defaults;
    const color = await guildColor(interaction.guildId);

    const roles = await XPRole.find({ guildId: interaction.guildId }).sort({ level: 1 });
    const rolesText = roles.length
        ? roles.map(r => `Nível ${r.level}: <@&${r.roleId}>`).join('\n')
        : '`Nenhum cargo de nível configurado`';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('⭐ Configuração — XP & Níveis')
        .setDescription('Configure o sistema de experiência e recompensas de nível.')
        .addFields(
            { name: 'Status', value: cfg.enabled ? '✅ Ativado' : '❌ Desativado', inline: true },
            { name: 'XP por Mensagem', value: `${cfg.minChatXp}–${cfg.maxChatXp} XP`, inline: true },
            { name: 'XP por Voz (min)', value: `${cfg.voiceXpRate} XP`, inline: true },
            { name: 'Cooldown', value: `${cfg.cooldownSeconds}s`, inline: true },
            { name: 'Canal de Notificação', value: cfg.notificationChannel ? `<#${cfg.notificationChannel}>` : '`Mesmo canal`', inline: true },
            { name: 'Cargos por Nível', value: rolesText, inline: false },
        )
        .setFooter(olympusFooter())
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:xp:toggle').setLabel(cfg.enabled ? 'Desativar XP' : 'Ativar XP').setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:xp:set_rates').setLabel('Taxas de XP').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:xp:set_message').setLabel('Mensagem de Level Up').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:xp:add_role').setLabel('Adicionar Cargo de Nível').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:xp:remove_role').setLabel('Remover Cargo de Nível').setStyle(ButtonStyle.Secondary),
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:xp_channel')
            .setPlaceholder('Selecione o canal de notificação (opcional)...')
            .setChannelTypes(ChannelType.GuildText)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: SISTEMAS EXTRAS
// ═══════════════════════════════════════════════════════════════
async function showSystems(interaction) {
    const guildId = interaction.guildId;
    const color = await guildColor(guildId);
    
    const guildDoc = await Guild.findOne({ guildId });

    const suggestions = guildDoc?.suggestionsConfig || {};
    const partnerships = guildDoc?.partnershipsConfig || {};
    const starboard = guildDoc?.starboardConfig || {};
    const instafeed = guildDoc?.instafeedConfig || {};

    const antiFake = guildDoc?.antiFakeConfig || {};
    const logs = guildDoc?.logsConfig || {};
    const profileCfg = guildDoc?.profileConfig || {};

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🚀 Configuração — Sistemas Extras')
        .setDescription('Configure funcionalidades adicionais do servidor.')
        .addFields(
            { name: '💡 Sugestões', value: suggestions.enabled && suggestions.channelId ? `✅ <#${suggestions.channelId}>` : '❌ Desativado', inline: true },
            { name: '🤝 Parcerias', value: partnerships.enabled ? '✅ Ativado' : '❌ Desativado', inline: true },
            { name: '⭐ Starboard', value: starboard.enabled && starboard.channelId ? `✅ <#${starboard.channelId}> (${starboard.minStars}⭐)` : '❌ Desativado', inline: true },
            { name: '📸 Instafeed', value: instafeed.enabled && instafeed.channelId ? `✅ <#${instafeed.channelId}>` : '❌ Desativado', inline: true },
            { name: '📋 Logs Avançados', value: logs.deleteChannel || logs.editChannel || logs.voiceChannel ? '✅ Configurado' : '❌ Desativado', inline: true },
            { name: '🛡️ Anti-Fake', value: antiFake.enabled ? `✅ (${antiFake.action || 'kick'})` : '❌ Desativado', inline: true },
            { name: '👤 Perfil', value: `Bio: ${profileCfg.maxBioLength || 150} chars`, inline: true },
        )
        .setFooter(olympusFooter())
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:systems:suggestions').setLabel('💡 Sugestões').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:systems:partnerships').setLabel('🤝 Parcerias').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:systems:starboard').setLabel('⭐ Starboard').setStyle(ButtonStyle.Primary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:systems:instafeed').setLabel('📸 Instafeed').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:systems:logs').setLabel('📋 Logs').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:systems:antifake').setLabel('🛡️ Anti-Fake').setStyle(ButtonStyle.Primary),
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:systems:perfil').setLabel('👤 Perfil').setStyle(ButtonStyle.Primary),
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: APARÊNCIA / BRANDING
// ═══════════════════════════════════════════════════════════════
async function showBranding(interaction) {
    const branding = await brandingManager.get(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(branding.accent || PALETTE.accent)
        .setTitle('🎨 Configuração — Aparência')
        .setDescription('Personalize a identidade visual do bot neste servidor.')
        .addFields(
            { name: 'Nome do Bot', value: `\`${branding.name}\``, inline: true },
            { name: 'Cor Principal', value: `\`${branding.color}\``, inline: true },
            { name: 'Cor de Destaque', value: `\`${branding.accent}\``, inline: true },
            { name: 'Avatar Personalizado', value: branding.avatar ? `[Ver imagem](${branding.avatar})` : '`Padrão do Discord`', inline: true },
        )
        .setFooter(olympusFooter('As cores devem estar em formato hexadecimal (#RRGGBB)'))
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:branding:set_name').setLabel('Alterar Nome').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:branding:set_colors').setLabel('Alterar Cores').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:branding:set_avatar').setLabel('Alterar Avatar').setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [row, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   SEÇÃO: PERMISSÕES DE COMANDOS
// ═══════════════════════════════════════════════════════════════
async function showPerms(interaction) {
    const color = await guildColor(interaction.guildId);
    const commands = await permissionsManager.listConfiguredCommands(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🔑 Configuração — Permissões de Comandos')
        .setDescription(
            'Configure quais cargos e usuários podem executar cada comando.\n\n' +
            '> **Nota:** Administradores sempre têm acesso a todos os comandos.\n\n' +
            '**Comandos com permissões configuradas:**\n' +
            (commands.length ? commands.map(c => `• \`/${c}\``).join('\n') : '`Nenhum — todos os comandos usam permissões padrão do Discord`')
        )
        .setFooter(olympusFooter())
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:perms:add').setLabel('Adicionar Permissão').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:perms:remove').setLabel('Remover Permissão').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cfg:perms:list').setLabel('Ver Detalhes').setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [row, backButton()] });
}

// ═══════════════════════════════════════════════════════════════
//   HANDLER DE SELEÇÃO DE MENU
// ═══════════════════════════════════════════════════════════════
async function handleSelect(interaction) {
    const id = interaction.customId;

    if (id === 'cfg:main') {
        const value = interaction.values[0];
        switch (value) {
            case 'cfg:ai': return showAI(interaction);
            case 'cfg:welcome': return showWelcome(interaction);
            case 'cfg:economy': return showEconomy(interaction);
            case 'cfg:xp': return showXP(interaction);
            case 'cfg:mod': return showMod(interaction);
            case 'cfg:perms': return showPerms(interaction);
            case 'cfg:systems': return showSystems(interaction);
            case 'cfg:branding': return showBranding(interaction);
        }
    }

    if (id.startsWith('cfg:sel:')) {
        const value = interaction.values[0];
        const guildId = interaction.guildId;

        if (id === 'cfg:sel:ai_channel') {
            await upsertConfig(guildId, 'aiConfig', { responseChannel: value });
            return interaction.reply({ content: `✅ Canal de resposta da IA definido para <#${value}>.`, flags: 64 });
        }
        if (id === 'cfg:sel:welcome_channel') {
            await upsertConfig(guildId, 'welcomeConfig', { welcomeChannel: value });
            return interaction.reply({ content: `✅ Canal de boas-vindas definido para <#${value}>.`, flags: 64 });
        }
        if (id === 'cfg:sel:welcome_roles') {
            await upsertConfig(guildId, 'welcomeConfig', { initialRoles: interaction.values });
            return interaction.reply({ content: `✅ Cargos de auto-role configurados!`, flags: 64 });
        }
        if (id === 'cfg:sel:xp_channel') {
            await upsertConfig(guildId, 'xpConfig', { notificationChannel: value });
            return interaction.reply({ content: `✅ Canal de notificação do XP definido para <#${value}>.`, flags: 64 });
        }
        if (id === 'cfg:sel:sug_channel') {
            await upsertConfig(guildId, 'suggestionsConfig', { channelId: value, enabled: true });
            return showSysSuggestions(interaction);
        }
        if (id === 'cfg:sel:part_analysis') {
            await upsertConfig(guildId, 'partnershipsConfig', { analysisChannel: value, enabled: true });
            return showSysPartnerships(interaction);
        }
        if (id === 'cfg:sel:part_announce') {
            await upsertConfig(guildId, 'partnershipsConfig', { announcementChannel: value, enabled: true });
            return showSysPartnerships(interaction);
        }
        if (id === 'cfg:sel:part_roles') {
            const partnerRole = interaction.values[0];
            const staffRole = interaction.values.length > 1 ? interaction.values[1] : null;
            await upsertConfig(guildId, 'partnershipsConfig', { partnerRole, staffRole });
            return showSysPartnerships(interaction);
        }
        if (id === 'cfg:sel:star_channel') {
            await upsertConfig(guildId, 'starboardConfig', { channelId: value, enabled: true });
            return showSysStarboard(interaction);
        }
        if (id === 'cfg:sel:insta_channel') {
            await upsertConfig(guildId, 'instafeedConfig', { channelId: value, enabled: true });
            return showSysInstafeed(interaction);
        }
        if (id === 'cfg:sel:insta_role') {
            await upsertConfig(guildId, 'instafeedConfig', { requiredRole: value });
            return showSysInstafeed(interaction);
        }
        if (id === 'cfg:sel:logs_voice') {
            await upsertConfig(guildId, 'logsConfig', { voiceChannel: value });
            return showSysLogs(interaction);
        }
        if (id === 'cfg:sel:logs_delete') {
            await upsertConfig(guildId, 'logsConfig', { deleteChannel: value });
            return showSysLogs(interaction);
        }
        if (id === 'cfg:sel:logs_edit') {
            await upsertConfig(guildId, 'logsConfig', { editChannel: value });
            return showSysLogs(interaction);
        }
        if (id === 'cfg:sel:logs_invite') {
            await upsertConfig(guildId, 'logsConfig', { inviteChannel: value });
            return showSysLogs(interaction);
        }
        if (id === 'cfg:sel:perfil_roles') {
            await upsertConfig(guildId, 'profileConfig', { extendedBioRoles: interaction.values });
            return showSysPerfil(interaction);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//   HANDLER DE BOTÕES
// ═══════════════════════════════════════════════════════════════
async function handleButton(interaction) {
    const id = interaction.customId;

    // Voltar ao menu principal
    if (id === 'cfg:back_main') return showMain(interaction);

    // ── IA ────────────────────────────────────────────────────
    if (id === 'cfg:ai:toggle') {
        const enabled = await toggleConfigField(interaction.guildId, 'aiConfig', 'enabled');
        await interaction.reply({ content: `✅ IA ${enabled ? 'ativada' : 'desativada'} com sucesso!`, flags: 64 });
        return;
    }
    if (id === 'cfg:ai:set_key') {
        return showModal(interaction, 'modal:ai:key', 'Chave da API Gemini', [
            { id: 'ai_key', label: 'Chave da API', placeholder: 'AIza...', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:ai:set_channel') {
        return showModal(interaction, 'modal:ai:channel', 'Canal de Resposta da IA', [
            { id: 'ai_channel', label: 'ID do Canal (deixe vazio para qualquer canal)', placeholder: '123456789012345678', style: TextInputStyle.Short, required: false },
        ]);
    }
    if (id === 'cfg:ai:toggle_mention') {
        const val = await toggleConfigField(interaction.guildId, 'aiConfig', 'mentionOnly');
        await interaction.reply({ content: `✅ IA configurada para responder ${val ? 'apenas quando mencionada' : 'em todas as mensagens'}.`, flags: 64 });
        return;
    }
    if (id === 'cfg:ai:toggle_memory') {
        const val = await toggleConfigField(interaction.guildId, 'aiConfig', 'keepMemory');
        await interaction.reply({ content: `✅ Memória de conversa ${val ? 'ativada' : 'desativada'}.`, flags: 64 });
        return;
    }
    if (id === 'cfg:ai:set_instruction') {
        return showModal(interaction, 'modal:ai:instruction', 'Instrução do Sistema (IA)', [
            { id: 'ai_instruction', label: 'Instrução do Sistema', placeholder: 'Você é um assistente amigável...', style: TextInputStyle.Paragraph, required: false },
        ]);
    }

    // ── Boas-vindas ───────────────────────────────────────────
    if (id === 'cfg:welcome:toggle') {
        const val = await toggleConfigField(interaction.guildId, 'welcomeConfig', 'enabled');
        await interaction.reply({ content: `✅ Boas-vindas ${val ? 'ativadas' : 'desativadas'}.`, flags: 64 });
        return;
    }
    if (id === 'cfg:welcome:set_channel') {
        return showModal(interaction, 'modal:welcome:channel', 'Canal de Boas-vindas', [
            { id: 'welcome_channel', label: 'ID do Canal', placeholder: '123456789012345678', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:welcome:set_msg') {
        return showModal(interaction, 'modal:welcome:msg', 'Mensagem de Boas-vindas (Canal)', [
            { id: 'welcome_msg', label: 'Mensagem', placeholder: 'Bem-vindo {user} ao {server}!', style: TextInputStyle.Paragraph },
        ]);
    }
    if (id === 'cfg:welcome:toggle_dm') {
        const val = await toggleConfigField(interaction.guildId, 'welcomeConfig', 'dmEnabled');
        await interaction.reply({ content: `✅ DM automática ${val ? 'ativada' : 'desativada'}.`, flags: 64 });
        return;
    }
    if (id === 'cfg:welcome:set_dm_msg') {
        return showModal(interaction, 'modal:welcome:dm_msg', 'Mensagem de Boas-vindas (DM)', [
            { id: 'welcome_dm_msg', label: 'Mensagem da DM', placeholder: 'Olá {user}, bem-vindo ao {server}!', style: TextInputStyle.Paragraph },
        ]);
    }
    if (id === 'cfg:welcome:set_roles') {
        return showModal(interaction, 'modal:welcome:roles', 'Cargos Iniciais', [
            { id: 'welcome_roles', label: 'IDs dos Cargos (separados por vírgula)', placeholder: '123456789, 987654321', style: TextInputStyle.Paragraph, required: false },
        ]);
    }

    // ── Economia ──────────────────────────────────────────────
    if (id === 'cfg:economy:toggle') {
        const val = await toggleConfigField(interaction.guildId, 'economyConfig', 'enabled');
        await interaction.reply({ content: `✅ Economia ${val ? 'ativada' : 'desativada'}.`, flags: 64 });
        return;
    }
    if (id === 'cfg:economy:set_currency') {
        return showModal(interaction, 'modal:economy:currency', 'Configurar Moeda', [
            { id: 'currency_name', label: 'Nome da Moeda', placeholder: 'moedas', style: TextInputStyle.Short },
            { id: 'currency_symbol', label: 'Símbolo/Emoji', placeholder: '🪙', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:economy:set_daily') {
        return showModal(interaction, 'modal:economy:daily', 'Configurar Daily', [
            { id: 'daily_amount', label: 'Quantidade do Daily', placeholder: '100', style: TextInputStyle.Short },
            { id: 'daily_cooldown', label: 'Cooldown em segundos', placeholder: '86400', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:economy:set_work') {
        return showModal(interaction, 'modal:economy:work', 'Configurar Trabalho', [
            { id: 'work_min', label: 'Ganho Mínimo', placeholder: '50', style: TextInputStyle.Short },
            { id: 'work_max', label: 'Ganho Máximo', placeholder: '200', style: TextInputStyle.Short },
            { id: 'work_cooldown', label: 'Cooldown em segundos', placeholder: '3600', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:economy:toggle_rob') {
        const val = await toggleConfigField(interaction.guildId, 'economyConfig', 'robEnabled');
        await interaction.reply({ content: `✅ Sistema de roubo ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
        return;
    }
    if (id === 'cfg:economy:shop') return showShopConfig(interaction);
    if (id === 'cfg:eco:back') return showEconomy(interaction);
    if (id === 'cfg:eco:shop_add') {
        return showModal(interaction, 'modal:eco:shop_add', 'Adicionar Item na Loja', [
            { id: 'item_name', label: 'Nome do Item', placeholder: 'Espada de Ouro', style: TextInputStyle.Short },
            { id: 'item_price', label: 'Preço (apenas números)', placeholder: '500', style: TextInputStyle.Short },
            { id: 'item_desc', label: 'Descrição', placeholder: 'Uma espada brilhante e poderosa.', style: TextInputStyle.Paragraph, required: false },
        ]);
    }
    if (id === 'cfg:eco:shop_rem') {
        return showModal(interaction, 'modal:eco:shop_rem', 'Remover Item da Loja', [
            { id: 'item_name', label: 'Nome exato do Item para remover', placeholder: 'Espada de Ouro', style: TextInputStyle.Short },
        ]);
    }

    // ── XP ────────────────────────────────────────────────────
    if (id === 'cfg:xp:toggle') {
        const val = await toggleConfigField(interaction.guildId, 'xpConfig', 'enabled');
        await interaction.reply({ content: `✅ Sistema de XP ${val ? 'ativado' : 'desativado'}.`, flags: 64 });
        return;
    }
    if (id === 'cfg:xp:set_rates') {
        return showModal(interaction, 'modal:xp:rates', 'Taxas de XP', [
            { id: 'xp_min', label: 'XP Mínimo por Mensagem', placeholder: '5', style: TextInputStyle.Short },
            { id: 'xp_max', label: 'XP Máximo por Mensagem', placeholder: '15', style: TextInputStyle.Short },
            { id: 'xp_voice', label: 'XP por Minuto em Voz', placeholder: '2', style: TextInputStyle.Short },
            { id: 'xp_cooldown', label: 'Cooldown em segundos', placeholder: '60', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:xp:set_channel') {
        return showModal(interaction, 'modal:xp:channel', 'Canal de Notificação de Level Up', [
            { id: 'xp_channel', label: 'ID do Canal (vazio = mesmo canal)', placeholder: '123456789012345678', style: TextInputStyle.Short, required: false },
        ]);
    }
    if (id === 'cfg:xp:add_role') {
        return showModal(interaction, 'modal:xp:add_role', 'Adicionar Cargo de Nível', [
            { id: 'xp_level', label: 'Nível', placeholder: '10', style: TextInputStyle.Short },
            { id: 'xp_role_id', label: 'ID do Cargo', placeholder: '123456789012345678', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:xp:remove_role') {
        return showModal(interaction, 'modal:xp:remove_role', 'Remover Cargo de Nível', [
            { id: 'xp_level_remove', label: 'Nível a remover', placeholder: '10', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:xp:set_message') {
        return showModal(interaction, 'modal:xp:message', 'Mensagem de Level Up', [
            { id: 'xp_levelup_msg', label: 'Mensagem (use {user} e {level})', placeholder: 'Parabéns {user}, você subiu para o nível **{level}**!', style: TextInputStyle.Paragraph },
        ]);
    }

    // ── Sistemas ──────────────────────────────────────────────
    if (id === 'cfg:systems:suggestions') return showSysSuggestions(interaction);
    if (id === 'cfg:systems:partnerships') return showSysPartnerships(interaction);
    if (id === 'cfg:systems:starboard') return showSysStarboard(interaction);
    if (id === 'cfg:systems:instafeed') return showSysInstafeed(interaction);
    if (id === 'cfg:systems:logs') return showSysLogs(interaction);
    if (id === 'cfg:systems:antifake') return showSysAntiFake(interaction);
    if (id === 'cfg:systems:perfil') return showSysPerfil(interaction);

    // Toggles dos novos sistemas
    if (id === 'cfg:sys:antifake_toggle') {
        await toggleConfigField(interaction.guildId, 'antiFakeConfig', 'enabled');
        return showSysAntiFake(interaction);
    }
    if (id === 'cfg:sys:antifake_kickbots') {
        await toggleConfigField(interaction.guildId, 'antiFakeConfig', 'kickBots');
        return showSysAntiFake(interaction);
    }
    if (id === 'cfg:sys:antifake_unverified') {
        await toggleConfigField(interaction.guildId, 'antiFakeConfig', 'kickUnverifiedBots');
        return showSysAntiFake(interaction);
    }
    if (id === 'cfg:sys:antifake_avatar') {
        await toggleConfigField(interaction.guildId, 'antiFakeConfig', 'blockNoAvatar');
        return showSysAntiFake(interaction);
    }
    if (id === 'cfg:sys:antifake_invite') {
        await toggleConfigField(interaction.guildId, 'antiFakeConfig', 'blockInviteLinks');
        return showSysAntiFake(interaction);
    }
    if (id === 'cfg:sys:antifake_config') {
        return showModal(interaction, 'modal:sys:antifake_cfg', 'Configuração Anti-Fake', [
            { id: 'af_action', label: 'Ação (log, kick, ban, timeout)', placeholder: 'kick', style: TextInputStyle.Short },
            { id: 'af_min_age', label: 'Idade mínima (dias) da conta', placeholder: '7', style: TextInputStyle.Short },
            { id: 'af_banned_nicks', label: 'Nicks banidos (separados por vírgula)', placeholder: 'admin, mod, staff', style: TextInputStyle.Paragraph, required: false },
        ]);
    }

    if (id === 'cfg:sys:back') return showSystems(interaction);
    if (id === 'cfg:sys:sug_toggle') {
        let doc = await Guild.findOne({ guildId: interaction.guildId });
        const cur = doc?.suggestionsConfig?.autoThread || false;
        await upsertConfig(interaction.guildId, 'suggestionsConfig', { autoThread: !cur });
        return showSysSuggestions(interaction);
    }
    if (id === 'cfg:sys:star_min') {
        return showModal(interaction, 'modal:systems:star_min', 'Mínimo de Reações', [
            { id: 'star_min_val', label: 'Número mínimo', placeholder: '5', style: TextInputStyle.Short }
        ]);
    }
    if (id === 'cfg:sys:star_emoji') {
        return showModal(interaction, 'modal:systems:star_emoji', 'Emoji do Starboard', [
            { id: 'star_emoji_val', label: 'Emoji (Padrão: ⭐)', placeholder: '⭐', style: TextInputStyle.Short, required: false }
        ]);
    }

    // ── Branding ──────────────────────────────────────────────
    if (id === 'cfg:branding:set_name') {
        return showModal(interaction, 'modal:branding:name', 'Alterar Nome do Bot', [
            { id: 'bot_name', label: 'Nome do Bot', placeholder: 'Olympus Bot', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:branding:set_colors') {
        return showModal(interaction, 'modal:branding:colors', 'Alterar Cores', [
            { id: 'embed_color', label: 'Cor Principal (hex)', placeholder: '#1a1a2e', style: TextInputStyle.Short },
            { id: 'accent_color', label: 'Cor de Destaque (hex)', placeholder: '#7b2fff', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:branding:set_avatar') {
        return showModal(interaction, 'modal:branding:avatar', 'Alterar Avatar do Bot', [
            { id: 'bot_avatar', label: 'URL da Imagem (PNG/JPG)', placeholder: 'https://...', style: TextInputStyle.Short, required: false },
        ]);
    }

    // ── Permissões ────────────────────────────────────────────
    if (id === 'cfg:perms:add') {
        return showModal(interaction, 'modal:perms:add', 'Adicionar Permissão de Comando', [
            { id: 'perm_command', label: 'Nome do Comando (sem /)', placeholder: 'ban', style: TextInputStyle.Short },
            { id: 'perm_type', label: 'Tipo (role ou user)', placeholder: 'role', style: TextInputStyle.Short },
            { id: 'perm_id', label: 'ID do Cargo ou Usuário', placeholder: '123456789012345678', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:perms:remove') {
        return showModal(interaction, 'modal:perms:remove', 'Remover Permissão de Comando', [
            { id: 'perm_command_rm', label: 'Nome do Comando (sem /)', placeholder: 'ban', style: TextInputStyle.Short },
            { id: 'perm_type_rm', label: 'Tipo (role ou user)', placeholder: 'role', style: TextInputStyle.Short },
            { id: 'perm_id_rm', label: 'ID do Cargo ou Usuário', placeholder: '123456789012345678', style: TextInputStyle.Short },
        ]);
    }
    if (id === 'cfg:perms:list') {
        return showModal(interaction, 'modal:perms:list', 'Ver Permissões de um Comando', [
            { id: 'perm_command_list', label: 'Nome do Comando (sem /)', placeholder: 'ban', style: TextInputStyle.Short },
        ]);
    }
}

// ═══════════════════════════════════════════════════════════════
//   HANDLER DE MODAIS (SUBMIT)
// ═══════════════════════════════════════════════════════════════
async function handleModal(interaction) {
    const { customId, fields, guildId } = interaction;

    try {
        // ── IA ────────────────────────────────────────────────
        if (customId === 'modal:ai:key') {
            const key = fields.getTextInputValue('ai_key');
            await upsertConfig(guildId, 'aiConfig', { apiKey: key });
            return interaction.reply({ content: '✅ Chave da API configurada com sucesso!', flags: 64 });
        }
        if (customId === 'modal:ai:channel') {
            const channel = fields.getTextInputValue('ai_channel') || null;
            await upsertConfig(guildId, 'aiConfig', { responseChannel: channel });
            return interaction.reply({ content: `✅ Canal de resposta ${channel ? `definido para <#${channel}>` : 'removido (qualquer canal)'}.`, flags: 64 });
        }
        if (customId === 'modal:ai:instruction') {
            const instruction = fields.getTextInputValue('ai_instruction') || null;
            await upsertConfig(guildId, 'aiConfig', { systemInstruction: instruction });
            return interaction.reply({ content: '✅ Instrução do sistema atualizada!', flags: 64 });
        }

        // ── Boas-vindas ───────────────────────────────────────
        if (customId === 'modal:welcome:channel') {
            const channel = fields.getTextInputValue('welcome_channel');
            await upsertConfig(guildId, 'welcomeConfig', { welcomeChannel: channel });
            return interaction.reply({ content: `✅ Canal de boas-vindas definido para <#${channel}>.`, flags: 64 });
        }
        if (customId === 'modal:welcome:msg') {
            const msg = fields.getTextInputValue('welcome_msg');
            await upsertConfig(guildId, 'welcomeConfig', { welcomeMsgChannel: msg });
            return interaction.reply({ content: '✅ Mensagem de boas-vindas atualizada!', flags: 64 });
        }
        if (customId === 'modal:welcome:dm_msg') {
            const msg = fields.getTextInputValue('welcome_dm_msg');
            await upsertConfig(guildId, 'welcomeConfig', { welcomeMsgDm: msg });
            return interaction.reply({ content: '✅ Mensagem de DM atualizada!', flags: 64 });
        }
        if (customId === 'modal:welcome:roles') {
            const raw = fields.getTextInputValue('welcome_roles');
            const roles = raw ? raw.split(',').map(r => r.trim()).filter(Boolean) : [];
            await upsertConfig(guildId, 'welcomeConfig', { initialRoles: roles });
            return interaction.reply({ content: `✅ ${roles.length} cargo(s) inicial(is) configurado(s).`, flags: 64 });
        }

        // ── Economia ──────────────────────────────────────────
        if (customId === 'modal:economy:currency') {
            const name = fields.getTextInputValue('currency_name');
            const symbol = fields.getTextInputValue('currency_symbol');
            await upsertConfig(guildId, 'economyConfig', { currencyName: name, currencySymbol: symbol });
            return interaction.reply({ content: `✅ Moeda configurada: ${symbol} ${name}.`, flags: 64 });
        }
        if (customId === 'modal:economy:daily') {
            const amount = parseInt(fields.getTextInputValue('daily_amount'));
            const cooldown = parseInt(fields.getTextInputValue('daily_cooldown'));
            if (isNaN(amount) || isNaN(cooldown)) return interaction.reply({ content: '❌ Valores inválidos. Use apenas números.', flags: 64 });
            await upsertConfig(guildId, 'economyConfig', { dailyAmount: amount, dailyCooldown: cooldown });
            return interaction.reply({ content: `✅ Daily configurado: ${amount} moedas, cooldown de ${cooldown}s.`, flags: 64 });
        }
        if (customId === 'modal:economy:work') {
            const min = parseInt(fields.getTextInputValue('work_min'));
            const max = parseInt(fields.getTextInputValue('work_max'));
            const cooldown = parseInt(fields.getTextInputValue('work_cooldown'));
            if (isNaN(min) || isNaN(max) || isNaN(cooldown)) return interaction.reply({ content: '❌ Valores inválidos. Use apenas números.', flags: 64 });
            await upsertConfig(guildId, 'economyConfig', { workMin: min, workMax: max, workCooldown: cooldown });
            return interaction.reply({ content: `✅ Trabalho configurado: ${min}–${max} moedas, cooldown de ${cooldown}s.`, flags: 64 });
        }
        if (customId === 'modal:eco:shop_add') {
            const { ShopProduct } = require('@models/Shop');
            const name = fields.getTextInputValue('item_name').trim();
            const price = parseInt(fields.getTextInputValue('item_price'));
            const desc = fields.getTextInputValue('item_desc') || 'Sem descrição';

            if (isNaN(price)) return interaction.reply({ content: '❌ Preço inválido. Use apenas números.', flags: 64 });

            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            await ShopProduct.findOneAndUpdate(
                { guildId, name: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
                { guildId, name, price, description: desc },
                { upsert: true, returnDocument: 'after' }
            );
            await interaction.reply({ content: `✅ Item **${name}** adicionado/atualizado na loja por **${price}**.`, flags: 64 });
            // Redesenha a config: a mensagem original de interação era em outro lugar, não podemos dar update num reply.
            return;
        }
        if (customId === 'modal:eco:shop_rem') {
            const { ShopProduct } = require('@models/Shop');
            const name = fields.getTextInputValue('item_name').trim();
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const deleted = await ShopProduct.findOneAndDelete({ guildId, name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
            
            return interaction.reply({ content: deleted ? `✅ Item **${deleted.name}** removido da loja.` : '❌ Item não encontrado.', flags: 64 });
        }

        // ── XP ────────────────────────────────────────────────
        if (customId === 'modal:xp:rates') {
            const min = parseInt(fields.getTextInputValue('xp_min'));
            const max = parseInt(fields.getTextInputValue('xp_max'));
            const voice = parseInt(fields.getTextInputValue('xp_voice'));
            const cooldown = parseInt(fields.getTextInputValue('xp_cooldown'));
            if ([min, max, voice, cooldown].some(isNaN)) return interaction.reply({ content: '❌ Valores inválidos. Use apenas números.', flags: 64 });
            await upsertConfig(guildId, 'xpConfig', { minChatXp: min, maxChatXp: max, voiceXpRate: voice, cooldownSeconds: cooldown });
            return interaction.reply({ content: `✅ Taxas de XP atualizadas: ${min}–${max} XP/msg, ${voice} XP/min em voz.`, flags: 64 });
        }
        if (customId === 'modal:xp:channel') {
            const channel = fields.getTextInputValue('xp_channel') || null;
            await upsertConfig(guildId, 'xpConfig', { notificationChannel: channel });
            return interaction.reply({ content: `✅ Canal de notificação ${channel ? `definido para <#${channel}>` : 'removido'}.`, flags: 64 });
        }
        if (customId === 'modal:xp:add_role') {
            const level = parseInt(fields.getTextInputValue('xp_level'));
            const roleId = fields.getTextInputValue('xp_role_id').trim();
            if (isNaN(level)) return interaction.reply({ content: '❌ Nível inválido.', flags: 64 });
            
            await XPRole.findOneAndUpdate(
                { guildId, level },
                { roleId },
                { upsert: true, returnDocument: 'after' }
            );

            return interaction.reply({ content: `✅ Cargo <@&${roleId}> configurado para o nível ${level}.`, flags: 64 });
        }
        if (customId === 'modal:xp:remove_role') {
            const level = parseInt(fields.getTextInputValue('xp_level_remove'));
            if (isNaN(level)) return interaction.reply({ content: '❌ Nível inválido.', flags: 64 });
            await XPRole.deleteOne({ guildId, level });
            return interaction.reply({ content: `✅ Cargo do nível ${level} removido.`, flags: 64 });
        }
        if (customId === 'modal:xp:message') {
            const msg = fields.getTextInputValue('xp_levelup_msg');
            await upsertConfig(guildId, 'xpConfig', { levelUpMessage: msg });
            return interaction.reply({ content: '✅ Mensagem de level up atualizada!', flags: 64 });
        }

        // ── Sistemas ──────────────────────────────────────────
        if (customId === 'modal:systems:suggestions') {
            const channel = fields.getTextInputValue('sug_channel');
            const thread = fields.getTextInputValue('sug_thread').toLowerCase().startsWith('s');
            await upsertConfig(guildId, 'suggestionsConfig', { enabled: true, channelId: channel, autoThread: thread });
            return interaction.reply({ content: `✅ Sugestões ativadas no canal <#${channel}>.`, flags: 64 });
        }
        if (customId === 'modal:systems:partnerships') {
            const analysis = fields.getTextInputValue('part_analysis');
            const announcement = fields.getTextInputValue('part_announcement');
            const role = fields.getTextInputValue('part_role') || null;
            await upsertConfig(guildId, 'partnershipsConfig', { enabled: true, analysisChannel: analysis, announcementChannel: announcement, partnerRole: role });
            return interaction.reply({ content: '✅ Sistema de parcerias configurado!', flags: 64 });
        }
        if (customId === 'modal:systems:starboard') {
            const channel = fields.getTextInputValue('star_channel');
            const min = parseInt(fields.getTextInputValue('star_min')) || 5;
            const emoji = fields.getTextInputValue('star_emoji') || '⭐';
            await upsertConfig(guildId, 'starboardConfig', { enabled: true, channelId: channel, minStars: min, emoji });
            return interaction.reply({ content: `✅ Starboard ativado no canal <#${channel}> (mínimo: ${min} ${emoji}).`, flags: 64 });
        }
        if (customId === 'modal:systems:instafeed') {
            const channel = fields.getTextInputValue('feed_channel');
            const role = fields.getTextInputValue('feed_role') || null;
            await upsertConfig(guildId, 'instafeedConfig', { enabled: true, channelId: channel, requiredRole: role });
            return interaction.reply({ content: `✅ Instafeed ativado no canal <#${channel}>.`, flags: 64 });
        }

        // ── Sistemas Extras Auxiliares ────────────────────────
        if (customId === 'modal:systems:star_min') {
            const min = parseInt(fields.getTextInputValue('star_min_val'));
            if (isNaN(min)) return interaction.reply({ content: '❌ Use apenas números.', flags: 64 });
            await upsertConfig(guildId, 'starboardConfig', { minStars: min, enabled: true });
            return showSysStarboard(interaction);
        }
        if (customId === 'modal:systems:star_emoji') {
            const emoji = fields.getTextInputValue('star_emoji_val') || '⭐';
            await upsertConfig(guildId, 'starboardConfig', { emoji, enabled: true });
            return showSysStarboard(interaction);
        }
        if (customId === 'modal:sys:antifake_cfg') {
            const action = fields.getTextInputValue('af_action').toLowerCase();
            const minAge = parseInt(fields.getTextInputValue('af_min_age'));
            const nicksRaw = fields.getTextInputValue('af_banned_nicks');
            
            if (!['log', 'kick', 'ban', 'timeout'].includes(action)) {
                return interaction.reply({ content: '❌ Ação inválida. Use `log`, `kick`, `ban` ou `timeout`.', flags: 64 });
            }
            if (isNaN(minAge) || minAge < 0) {
                return interaction.reply({ content: '❌ Idade mínima inválida. Use um número inteiro maior ou igual a 0.', flags: 64 });
            }
            
            const bannedNicks = nicksRaw ? nicksRaw.split(',').map(n => n.trim()).filter(Boolean) : [];
            await upsertConfig(guildId, 'antiFakeConfig', { action, minAccountAge: minAge, bannedNicknames: bannedNicks });
            
            return interaction.reply({ content: '✅ Configurações do Anti-Fake atualizadas com sucesso!', flags: 64 });
        }

        // ── Branding ──────────────────────────────────────────
        if (customId === 'modal:branding:name') {
            const name = fields.getTextInputValue('bot_name');
            await brandingManager.set(guildId, { botName: name });
            return interaction.reply({ content: `✅ Nome do bot atualizado para **${name}**.`, flags: 64 });
        }
        if (customId === 'modal:branding:colors') {
            const color = fields.getTextInputValue('embed_color');
            const accent = fields.getTextInputValue('accent_color');
            if (!/^#[0-9A-Fa-f]{6}$/.test(color) || !/^#[0-9A-Fa-f]{6}$/.test(accent)) {
                return interaction.reply({ content: '❌ Cores inválidas. Use o formato hexadecimal: `#RRGGBB`', flags: 64 });
            }
            await brandingManager.set(guildId, { embedColor: color, accentColor: accent });
            return interaction.reply({ content: `✅ Cores atualizadas! Principal: \`${color}\` | Destaque: \`${accent}\``, flags: 64 });
        }
        if (customId === 'modal:branding:avatar') {
            const avatar = fields.getTextInputValue('bot_avatar') || null;
            await brandingManager.set(guildId, { botAvatar: avatar });
            return interaction.reply({ content: avatar ? '✅ URL do avatar atualizada!' : '✅ Avatar personalizado removido.', flags: 64 });
        }

        // ── Permissões ────────────────────────────────────────
        if (customId === 'modal:perms:add') {
            const command = fields.getTextInputValue('perm_command').toLowerCase();
            const type = fields.getTextInputValue('perm_type').toLowerCase();
            const id = fields.getTextInputValue('perm_id').trim();
            if (!['role', 'user'].includes(type)) return interaction.reply({ content: '❌ Tipo inválido. Use `role` ou `user`.', flags: 64 });
            await permissionsManager.addPermission(guildId, command, type, id);
            return interaction.reply({ content: `✅ Permissão adicionada: \`/${command}\` → ${type} \`${id}\`.`, flags: 64 });
        }
        if (customId === 'modal:perms:remove') {
            const command = fields.getTextInputValue('perm_command_rm').toLowerCase();
            const type = fields.getTextInputValue('perm_type_rm').toLowerCase();
            const id = fields.getTextInputValue('perm_id_rm').trim();
            if (!['role', 'user'].includes(type)) return interaction.reply({ content: '❌ Tipo inválido. Use `role` ou `user`.', flags: 64 });
            await permissionsManager.removePermission(guildId, command, type, id);
            return interaction.reply({ content: `✅ Permissão removida: \`/${command}\` → ${type} \`${id}\`.`, flags: 64 });
        }
        if (customId === 'modal:perms:list') {
            const command = fields.getTextInputValue('perm_command_list').toLowerCase();
            const perms = await permissionsManager.listPermissions(guildId, command);
            const color = await guildColor(guildId);
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🔑 Permissões: /${command}`)
                .setDescription(
                    perms.length
                        ? perms.map(p => `• **${p.type}**: \`${p.targetId}\``).join('\n')
                        : '`Nenhuma permissão configurada — usa permissões padrão do Discord`'
                )
                .setFooter(olympusFooter())
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        // Fallback
        await interaction.reply({ content: '✅ Configuração salva!', flags: 64 });

    } catch (err) {
        logger.error(`❌ [ConfigHandler] Erro no modal: ${err.message}`);
        try {
            await interaction.reply({ content: '❌ Erro ao salvar configuração. Verifique os dados e tente novamente.', flags: 64 });
        } catch { /* ignore */ }
    }
}

// ═══════════════════════════════════════════════════════════════
//   HELPER: Exibir modal genérico
// ═══════════════════════════════════════════════════════════════
async function showModal(interaction, customId, title, inputs) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
    for (const input of inputs) {
        const textInput = new TextInputBuilder()
            .setCustomId(input.id)
            .setLabel(input.label)
            .setStyle(input.style || TextInputStyle.Short)
            .setRequired(input.required !== false);
        if (input.placeholder) textInput.setPlaceholder(input.placeholder);
        modal.addComponents(new ActionRowBuilder().addComponents(textInput));
    }
    await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════════════════
//   SUB-PÁGINAS DE SISTEMAS EXTRAS
// ═══════════════════════════════════════════════════════════════
async function showSysSuggestions(interaction) {
    const color = await guildColor(interaction.guildId);
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId }) || {};
    const cfg = guildDoc.suggestionsConfig || {};

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('💡 Sistemas — Sugestões')
        .setDescription('O sistema de sugestões permite que membros deem ideias para o servidor.')
        .addFields(
            { name: 'Status', value: (cfg.enabled && cfg.channelId) ? '✅ Ativado' : '❌ Desativado', inline: true },
            { name: 'Canal', value: cfg.channelId ? `<#${cfg.channelId}>` : '`Não configurado`', inline: true },
            { name: 'Auto-Thread', value: cfg.autoThread ? '✅ Sim' : '❌ Não', inline: true }
        )
        .setFooter(olympusFooter());

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:sug_toggle').setLabel(cfg.autoThread ? 'Desativar Auto-Thread' : 'Ativar Auto-Thread').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:sys:back').setLabel('← Voltar a Sistemas').setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:sug_channel')
            .setPlaceholder('Selecione o canal de sugestões...')
            .setChannelTypes(ChannelType.GuildText)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function showSysPartnerships(interaction) {
    const color = await guildColor(interaction.guildId);
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId }) || {};
    const cfg = guildDoc.partnershipsConfig || {};

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🤝 Sistemas — Parcerias')
        .setDescription('Candidatura, análise e anúncio automático de parcerias.')
        .addFields(
            { name: 'Canal de Análise', value: cfg.analysisChannel ? `<#${cfg.analysisChannel}>` : '`Nenhum`', inline: true },
            { name: 'Canal de Divulgação', value: cfg.announcementChannel ? `<#${cfg.announcementChannel}>` : '`Nenhum`', inline: true },
            { name: 'Cargo Parceiro', value: cfg.partnerRole ? `<@&${cfg.partnerRole}>` : '`Nenhum`', inline: true },
            { name: 'Cargo Staff/Manager', value: cfg.staffRole ? `<@&${cfg.staffRole}>` : '`Nenhum`', inline: true },
        )
        .setFooter(olympusFooter());

    const row1 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:part_analysis')
            .setPlaceholder('Selecione o canal de Análise (staff)...')
            .setChannelTypes(ChannelType.GuildText)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:part_announce')
            .setPlaceholder('Selecione o canal de Divulgação/Anúncio...')
            .setChannelTypes(ChannelType.GuildText)
    );
    const row3 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('cfg:sel:part_roles')
            .setPlaceholder('Selecione Cargo Parceiro (1) e Cargo Staff/Manager (2)')
            .setMinValues(1)
            .setMaxValues(2)
    );
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:back').setLabel('← Voltar a Sistemas').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4] });
}

async function showSysStarboard(interaction) {
    const color = await guildColor(interaction.guildId);
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId }) || {};
    const cfg = guildDoc.starboardConfig || {};

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('⭐ Sistemas — Starboard')
        .setDescription('Destaca as melhores mensagens baseadas em reações.')
        .addFields(
            { name: 'Canal', value: cfg.channelId ? `<#${cfg.channelId}>` : '`Nenhum`', inline: true },
            { name: 'Mínimo de Reações', value: `${cfg.minStars || 5}`, inline: true },
            { name: 'Emoji', value: cfg.emoji || '⭐', inline: true },
        )
        .setFooter(olympusFooter());

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:star_min').setLabel('Definir Mínimo...').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:sys:star_emoji').setLabel('Definir Emoji...').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:sys:back').setLabel('← Voltar a Sistemas').setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:star_channel')
            .setPlaceholder('Selecione o canal do Starboard...')
            .setChannelTypes(ChannelType.GuildText)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function showSysInstafeed(interaction) {
    const color = await guildColor(interaction.guildId);
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId }) || {};
    const cfg = guildDoc.instafeedConfig || {};

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('📸 Sistemas — Instafeed')
        .setDescription('Permite postagens e simulação de rede social com imagens no Discord.')
        .addFields(
            { name: 'Canal Principal', value: cfg.channelId ? `<#${cfg.channelId}>` : '`Nenhum`', inline: true },
            { name: 'Cargo Necessário', value: cfg.requiredRole ? `<@&${cfg.requiredRole}>` : '`Todos podem`', inline: true }
        )
        .setFooter(olympusFooter());

    const row1 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('cfg:sel:insta_channel')
            .setPlaceholder('Selecione o canal do Instafeed...')
            .setChannelTypes(ChannelType.GuildText)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('cfg:sel:insta_role')
            .setPlaceholder('Selecione o cargo necessário (opcional)...')
            .setMinValues(1)
            .setMaxValues(1)
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:back').setLabel('← Voltar a Sistemas').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3] });
}

// ═══════════════════════════════════════════════════════════════
//   NOVOS SISTEMAS: LOGS, ANTI-FAKE, PERFIL
// ═══════════════════════════════════════════════════════════════

async function showSysLogs(interaction) {
    const color = await guildColor(interaction.guildId);
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId }) || {};
    const cfg = guildDoc.logsConfig || {};

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('📋 Sistemas — Logs Avançados')
        .setDescription('Configure os canais onde os eventos do servidor serão registrados.')
        .addFields(
            { name: 'Deletar Mensagens', value: cfg.deleteChannel ? `<#${cfg.deleteChannel}>` : '`Apenas logs básicos`', inline: true },
            { name: 'Editar Mensagens', value: cfg.editChannel ? `<#${cfg.editChannel}>` : '`Apenas logs básicos`', inline: true },
            { name: 'Eventos de Voz', value: cfg.voiceChannel ? `<#${cfg.voiceChannel}>` : '`Apenas logs básicos`', inline: true },
            { name: 'Invites (Criar/Deletar)', value: cfg.inviteChannel ? `<#${cfg.inviteChannel}>` : '`Apenas logs básicos`', inline: true }
        )
        .setFooter(olympusFooter());

    const row1 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('cfg:sel:logs_delete').setPlaceholder('Canal p/ Mensagens Deletadas...').setChannelTypes(ChannelType.GuildText)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('cfg:sel:logs_edit').setPlaceholder('Canal p/ Mensagens Editadas...').setChannelTypes(ChannelType.GuildText)
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('cfg:sel:logs_voice').setPlaceholder('Canal p/ Eventos de Voz...').setChannelTypes(ChannelType.GuildText)
    );
    const row4 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('cfg:sel:logs_invite').setPlaceholder('Canal p/ Eventos de Convites...').setChannelTypes(ChannelType.GuildText)
    );
    const row5 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:back').setLabel('← Voltar a Sistemas').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4, row5] });
}

async function showSysAntiFake(interaction) {
    const color = await guildColor(interaction.guildId);
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId }) || {};
    const cfg = guildDoc.antiFakeConfig || {};

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🛡️ Sistemas — Anti-Fake')
        .setDescription('Bloqueie a entrada de contas recentes ou bots não confiáveis.')
        .addFields(
            { name: 'Status', value: cfg.enabled ? '✅ Ativado' : '❌ Desativado', inline: true },
            { name: 'Ação Automática', value: (cfg.action || 'kick').toUpperCase(), inline: true },
            { name: 'Min. Dias de Conta', value: `${cfg.minAccountAge || 7} dias`, inline: true },
            { name: 'Contas Sem Avatar', value: cfg.blockNoAvatar ? '🚫 Bloquear' : '✅ Permitir', inline: true },
            { name: 'Convites no Nome', value: cfg.blockInviteLinks ? '🚫 Bloquear' : '✅ Permitir', inline: true },
            { name: 'Expulsar Bots', value: cfg.kickBots ? '✅ Sim' : '❌ Não', inline: true },
            { name: 'Expulsar Não Verificados', value: cfg.kickUnverifiedBots ? '✅ Sim (apenas bots não verificados)' : '❌ Não (se ativado acima, expulsa TODOS)', inline: false },
            { name: 'Nicks Banidos', value: cfg.bannedNicknames?.length ? `\`${cfg.bannedNicknames.join(', ')}\`` : '`Nenhum configurado`', inline: false }
        )
        .setFooter(olympusFooter('Defina os limites e palavras banidas pelo botão abaixo'));

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:antifake_toggle').setLabel(cfg.enabled ? 'Desativar Anti-Fake' : 'Ativar Anti-Fake').setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:sys:antifake_kickbots').setLabel(cfg.kickBots ? 'Permitir Bots' : 'Expulsar Bots').setStyle(cfg.kickBots ? ButtonStyle.Danger : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('cfg:sys:antifake_unverified').setLabel(cfg.kickUnverifiedBots ? 'Ignorar Verificação' : 'Apenas Ñ-Verificados').setStyle(cfg.kickUnverifiedBots ? ButtonStyle.Danger : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cfg:sys:antifake_config').setLabel('Configurar Limites/Ações').setStyle(ButtonStyle.Primary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:antifake_avatar').setLabel(cfg.blockNoAvatar ? 'Permitir Sem Avatar' : 'Bloquear Sem Avatar').setStyle(cfg.blockNoAvatar ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cfg:sys:antifake_invite').setLabel(cfg.blockInviteLinks ? 'Permitir Convites (Nome)' : 'Bloquear Convites (Nome)').setStyle(cfg.blockInviteLinks ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cfg:sys:back').setLabel('← Voltar a Sistemas').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function showSysPerfil(interaction) {
    const color = await guildColor(interaction.guildId);
    const guildDoc = await Guild.findOne({ guildId: interaction.guildId }) || {};
    const cfg = guildDoc.profileConfig || {};
    const extRoles = cfg.extendedBioRoles || [];

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('👤 Sistemas — Perfil Social')
        .setDescription('Configure limites de personalização para os perfis dos usuários.')
        .addFields(
            { name: 'Tamanho Padrão Bio', value: `${cfg.maxBioLength || 150} caracteres`, inline: true },
            { name: 'Tamanho Expandido Bio', value: `${cfg.extendedBioLength || 500} caracteres`, inline: true },
            { name: 'Cargos p/ Bio Expandida', value: extRoles.length ? extRoles.map(r => `<@&${r}>`).join(', ') : '`Nenhum cargo selecionado`', inline: false }
        )
        .setFooter(olympusFooter('Para mudar os números de limite use slash commands / (TODO) ou banco'));

    const row1 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('cfg:sel:perfil_roles')
            .setPlaceholder('Selecionar Cargos com Bio Expandida...')
            .setMinValues(1)
            .setMaxValues(10)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:sys:back').setLabel('← Voltar a Sistemas').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

async function showShopConfig(interaction) {
    const { ShopProduct } = require('@models/Shop');
    const color = await guildColor(interaction.guildId);
    
    const products = await ShopProduct.find({ guildId: interaction.guildId }).sort({ price: 1 });
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🛒 Configuração — Loja')
        .setDescription('Adicione ou remova itens que os jogadores podem comprar.')
        .addFields(
            { 
                name: 'Itens Disponíveis', 
                value: products.length 
                    ? products.map((p, i) => `**${i + 1}.** ${p.name} — ${p.price}`).join('\n').substring(0, 1024) 
                    : '`A loja está vazia.`', 
                inline: false 
            }
        )
        .setFooter(olympusFooter());

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:eco:shop_add').setLabel('Adicionar Item').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cfg:eco:shop_rem').setLabel('Remover Item').setStyle(ButtonStyle.Danger),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cfg:main').setLabel('← Voltar a Economia').setStyle(ButtonStyle.Secondary)
        // O valor 'cfg:main' seria capturado lá em cima no menu e não aqui no button handler,
        // mas podemos apenas criar um cfg:eco:back (e mapear no handleButton) ou simplesmente chamar showEconomy(interaction).
        // Vamos usar um botão com customId que mapeie para voltar.
    );
    
    // Corrigindo o botão de voltar:
    row2.setComponents(new ButtonBuilder().setCustomId('cfg:eco:back').setLabel('← Voltar a Economia').setStyle(ButtonStyle.Secondary));

    await interaction.update({ embeds: [embed], components: [row1, row2] });
}

// ═══════════════════════════════════════════════════════════════
//   REFERÊNCIA CIRCULAR: showMod é definido no modHandler
// ═══════════════════════════════════════════════════════════════
async function showMod(interaction) {
    const modHandler = require('@handlers/interactions/modHandler');
    return modHandler.showModConfig(interaction);
}

module.exports = { handleSelect, handleButton, handleModal, showMain };
