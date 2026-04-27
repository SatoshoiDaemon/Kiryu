// src/utils/helpers/embedHelper.js
// ============================================================
//   Olympus Community Bot — Helper de Embeds
//   Paleta: Azul escuro (#1a1a2e), Preto (#0d0d0d), Roxo (#7b2fff)
// ============================================================

const { EmbedBuilder } = require('discord.js');
const Guild = require('@models/Guild');

// Paleta padrão Olympus
const PALETTE = {
    primary:   '#1a1a2e',   // Azul escuro
    accent:    '#7b2fff',   // Roxo vibrante
    success:   '#2ecc71',   // Verde
    warning:   '#f39c12',   // Laranja
    error:     '#e74c3c',   // Vermelho
    info:      '#3498db',   // Azul claro
    dark:      '#0d0d0d',   // Preto profundo
    secondary: '#16213e',   // Azul médio
};

/**
 * Obtém a cor configurada para o servidor ou usa a padrão.
 * @param {string} guildId
 * @returns {Promise<string>} Hex color
 */
async function getGuildColor(guildId) {
    try {
        if (!guildId) return PALETTE.primary;
        const guild = await Guild.findOne({ guildId });
        return guild?.branding?.embedColor || PALETTE.primary;
    } catch {
        return PALETTE.primary;
    }
}

/**
 * Obtém a cor de destaque configurada para o servidor.
 * @param {string} guildId
 * @returns {Promise<string>} Hex color
 */
async function getGuildAccent(guildId) {
    try {
        if (!guildId) return PALETTE.accent;
        const guild = await Guild.findOne({ guildId });
        return guild?.branding?.accentColor || PALETTE.accent;
    } catch {
        return PALETTE.accent;
    }
}

/**
 * Cria um embed padrão com a cor do servidor.
 * @param {string} guildId
 * @returns {Promise<EmbedBuilder>}
 */
async function createEmbed(guildId) {
    const color = await getGuildColor(guildId);
    return new EmbedBuilder().setColor(color);
}

/**
 * Cria um embed de sucesso.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function successEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(PALETTE.success)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Cria um embed de erro.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function errorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(PALETTE.error)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Cria um embed de aviso.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function warningEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(PALETTE.warning)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Cria um embed de informação.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function infoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(PALETTE.info)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Rodapé padrão Olympus Studio.
 * @param {string} [extra] Texto adicional
 * @returns {Object}
 */
function olympusFooter(extra) {
    const text = extra ? `${extra} • Olympus Studio` : 'Olympus Studio';
    return { text };
}

/**
 * Busca uma imagem da API waifu.pics
 * @param {string} category Categoria da imagem
 * @returns {Promise<string>} URL da imagem
 */
async function fetchWaifuImage(category) {
    try {
        const response = await fetch(`https://api.waifu.pics/sfw/${category}`);
        if (!response.ok) throw new Error('Falha na requisição');
        const data = await response.json();
        return data.url;
    } catch (err) {
        // Silencia erros da API externa para não interromper o fluxo
        return null;
    }
}

module.exports = {
    PALETTE,
    getGuildColor,
    getGuildAccent,
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    olympusFooter,
    fetchWaifuImage,
};
