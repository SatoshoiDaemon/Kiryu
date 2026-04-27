// src/commands/admin/config.js
// ============================================================
//   Tengoku Community Bot — Comando /config
//   Painel central de configuração do bot para o servidor
// ============================================================

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('⚙️ Painel de configuração do bot para este servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const branding = await brandingManager.get(interaction.guildId);
        await interaction.reply({
            embeds: [buildMainEmbed(branding)],
            components: [buildMainMenu()],
            flags: 64,
        });
    },
};

// ── Embed principal ───────────────────────────────────────────
function buildMainEmbed(branding) {
    return new EmbedBuilder()
        .setColor(branding.accent)
        .setTitle('⚙️ Painel de Configuração')
        .setDescription(
            '> Bem-vindo ao painel de configuração do **Tengoku Bot**.\n' +
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
        .setFooter(tengokuFooter('Use os menus abaixo para navegar'))
        .setTimestamp();
}

// ── Menu principal de categorias ──────────────────────────────
function buildMainMenu() {
    const select = new StringSelectMenuBuilder()
        .setCustomId('cfg:main')
        .setPlaceholder('Selecione uma categoria...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('🤖 Inteligência Artificial')
                .setDescription('Configurar o assistente de IA Gemini')
                .setValue('cfg:ai'),
            new StringSelectMenuOptionBuilder()
                .setLabel('👋 Boas-vindas')
                .setDescription('Mensagens e cargos automáticos de entrada')
                .setValue('cfg:welcome'),
            new StringSelectMenuOptionBuilder()
                .setLabel('💰 Economia')
                .setDescription('Moeda, daily, trabalho e roubo')
                .setValue('cfg:economy'),
            new StringSelectMenuOptionBuilder()
                .setLabel('⭐ XP & Níveis')
                .setDescription('Sistema de experiência e recompensas')
                .setValue('cfg:xp'),
            new StringSelectMenuOptionBuilder()
                .setLabel('🛡️ Moderação & Proteção')
                .setDescription('Anti-spam, anti-invite, logs e proteções')
                .setValue('cfg:mod'),
            new StringSelectMenuOptionBuilder()
                .setLabel('🔑 Permissões de Comandos')
                .setDescription('Controle granular de acesso por cargo/usuário')
                .setValue('cfg:perms'),
            new StringSelectMenuOptionBuilder()
                .setLabel('🚀 Sistemas Extras')
                .setDescription('Sugestões, parcerias, starboard e instafeed')
                .setValue('cfg:systems'),
            new StringSelectMenuOptionBuilder()
                .setLabel('🎨 Aparência')
                .setDescription('Cores, nome e identidade visual do bot')
                .setValue('cfg:branding'),
        );

    return new ActionRowBuilder().addComponents(select);
}
