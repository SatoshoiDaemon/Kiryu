// src/events/interaction/interactionCreate.js
// ============================================================
//   Olympus Community Bot — Roteador Central de Interações
// ============================================================

const { EmbedBuilder } = require('discord.js');
const logger = require('@utils/logger');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const configHandler = require('@handlers/interactions/configHandler');
const modHandler = require('@handlers/interactions/modHandler');
const embedHandler = require('@handlers/interactions/embedHandler');
const verifyHandler = require('@handlers/interactions/verifyHandler');
const helpHandler = require('@handlers/interactions/helpHandler');
const partnershipHandler = require('@handlers/interactions/partnershipHandler');
const rulesHandler = require('@handlers/interactions/rulesHandler');
const autoResponseHandler = require('@handlers/interactions/autoResponseHandler');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                return await handleCommand(interaction, client);
            }

            if (interaction.isAnySelectMenu()) {
                return await handleSelectMenu(interaction);
            }

            if (interaction.isButton()) {
                return await handleButton(interaction);
            }

            if (interaction.isModalSubmit()) {
                return await handleModal(interaction);
            }

            // Tipo de interação não reconhecido — responder para evitar timeout
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: '❌ Tipo de interação não suportado.', flags: 64 });
            }

        } catch (err) {
            logger.error(`❌ Erro na interação de ${interaction.user?.tag}: ${err.message}`);
            logger.error(err.stack);
            await replyError(interaction, err);
        }
    },
};

// ── Comandos ──────────────────────────────────────────────────
async function handleCommand(interaction, client) {
    const command = client.commands?.get(interaction.commandName);
    if (!command) {
        return interaction.reply({ content: '❌ Comando não encontrado.', flags: 64 });
    }
    try {
        await command.execute(interaction, client);
    } catch (err) {
        logger.error(`❌ Erro no comando /${interaction.commandName}: ${err.message}`);
        logger.error(err.stack);
        await replyError(interaction, err);
    }
}

// ── Menus de seleção ──────────────────────────────────────────
async function handleSelectMenu(interaction) {
    const id = interaction.customId;

    try {
        // Menu de ajuda
        if (id === 'help:category') {
            return await helpHandler.handleHelpSelect(interaction);
        }

        // Menus do /config
        if (id.startsWith('cfg:')) {
            return await configHandler.handleSelect(interaction);
        }

        // Menus do /embed
        if (id.startsWith('embed:')) {
            return await embedHandler.handleEmbedSelect(interaction);
        }

        // Menus das Regras Agendadas
        if (id.startsWith('rule:')) {
            return await rulesHandler.handleSelect(interaction);
        }

        // Menus das Auto Respostas
        if (id.startsWith('ar:')) {
            return await autoResponseHandler.handleSelect(interaction);
        }

        // Fallback: interação não reconhecida
        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({ content: '❌ Interação não reconhecida.', flags: 64 });
        }
    } catch (err) {
        logger.error(`❌ Erro no menu de seleção ${id}: ${err.message}`);
        logger.error(err.stack);
        await replyError(interaction, err);
    }
}

// ── Botões ────────────────────────────────────────────────────
async function handleButton(interaction) {
    const id = interaction.customId;

    try {
        // Botões de ajuda
        if (id === 'help:back') {
            return await helpHandler.handleHelpBack(interaction);
        }

        // Botões de casamento
        if (id.startsWith('marry:')) {
            return await helpHandler.handleMarriageButton(interaction);
        }

        // Botões de blackjack
        if (id.startsWith('bj:')) {
            return await helpHandler.handleBlackjackButton(interaction);
        }

        // Botões de RP (Retribuir)
        if (id.startsWith('rp:')) {
            return await handleRPButton(interaction);
        }

        // Botões de Mines
        if (id.startsWith('mines:')) {
            return await handleMinesButton(interaction);
        }

        // Botões de parceria
        if (id.startsWith('partnership:')) {
            return await partnershipHandler.handlePartnershipButton(interaction);
        }

        // Botões de Moderação e Whitelist
        if (id.startsWith('cfg:mod:')) {
            return await modHandler.handleModButton(interaction);
        }

        // Botões do /embed
        if (id.startsWith('embed:')) {
            return await embedHandler.handleEmbedButton(interaction);
        }

        // Botões de Verificação
        if (id === 'verify:start') {
            return await verifyHandler.handleVerifyStart(interaction);
        }
        if (id === 'verify:answer') {
            return await verifyHandler.handleVerifyAnswer(interaction);
        }

        // Botões do /config — geral (inclui cfg:back_main)
        if (id.startsWith('cfg:')) {
            return await configHandler.handleButton(interaction);
        }

        // Botões de Regras Agendadas
        if (id.startsWith('rule:')) {
            return await rulesHandler.handleButton(interaction);
        }

        // Botões de Auto Respostas
        if (id.startsWith('ar:')) {
            return await autoResponseHandler.handleButton(interaction);
        }

        // Fallback: botão não reconhecido
        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({ content: '❌ Ação não reconhecida.', flags: 64 });
        }
    } catch (err) {
        logger.error(`❌ Erro no botão ${id}: ${err.message}`);
        logger.error(err.stack);
        await replyError(interaction, err);
    }
}

// ── Modais ────────────────────────────────────────────────────
async function handleModal(interaction) {
    const id = interaction.customId;

    try {
        // Modal de sugestão
        if (id === 'modal:suggestion:submit') {
            return await helpHandler.handleSuggestionModal(interaction);
        }

        // Modal de parceria
        if (id === 'modal:partnership:submit') {
            return await partnershipHandler.handlePartnershipModal(interaction);
        }

        // Modais de Moderação (Whitelist/Limites)
        if (id.startsWith('modal:mod:')) {
            return await modHandler.handleModModal(interaction);
        }

        // Modais do /embed
        if (id.startsWith('modal:embed:')) {
            return await embedHandler.handleEmbedModal(interaction);
        }

        // Modais de Verificação
        if (id === 'modal:verify:submit') {
            return await verifyHandler.handleVerifySubmit(interaction);
        }

        // Modal do perfil
        if (id === 'modal:perfil:edit') {
            return await handleProfileModal(interaction);
        }

        // Modais do /config geral
        if (id.startsWith('modal:')) {
            // Exceção de Regras que também tem modal: prefixo mas outro handler
            if (id.startsWith('modal:rule:')) {
                return await rulesHandler.handleModal(interaction);
            }
            // Exceção de Auto-respostas
            if (id.startsWith('modal:ar:')) {
                return await autoResponseHandler.handleModal(interaction);
            }
            return await configHandler.handleModal(interaction);
        }

        // Fallback: modal não reconhecido
        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({ content: '❌ Modal não reconhecido.', flags: 64 });
        }
    } catch (err) {
        logger.error(`❌ Erro no modal ${id}: ${err.message}`);
        logger.error(err.stack);
        await replyError(interaction, err);
    }
}

// ── Botões de RP (Retribuir) ──────────────────────────────────
const RP_CONFIG = {
    hug:  { emoji: '🤗', label: 'abraçou', color: 0x5865F2, endpoint: 'hug' },
    kiss: { emoji: '💋', label: 'beijou', color: 0xEB459E, endpoint: 'kiss' },
    slap: { emoji: '👋', label: 'deu um tapa em', color: 0xED4245, endpoint: 'slap' },
    pat:  { emoji: '🥰', label: 'fez carinho em', color: 0x7B2FFF, endpoint: 'pat' },
    bonk: { emoji: '🔨', label: 'deu um bonk em', color: 0xFEE75C, endpoint: 'bonk' },
    cry:  { emoji: '🤗', label: 'consolou', color: 0x5865F2, endpoint: 'hug' },
    bite: { emoji: '🧛', label: 'mordeu de volta', color: 0x992D22, endpoint: 'bite' },
    dance: { emoji: '💃', label: 'dançou de volta com', color: 0xE67E22, endpoint: 'dance' },
    highfive: { emoji: '✋', label: 'deu um toque de volta em', color: 0xF1C40F, endpoint: 'highfive' },
};

async function handleRPButton(interaction) {
    // Formato: rp:{tipo}:{idUsuarioPermitido}:{idUsuarioOriginal}
    const [, type, allowedUserId, originalUserId] = interaction.customId.split(':');

    if (interaction.user.id !== allowedUserId) {
        return interaction.reply({ content: '❌ Este botão não é para você!', flags: 64 });
    }

    const rpCfg = RP_CONFIG[type];
    if (!rpCfg) return interaction.reply({ content: '❌ Interação inválida.', flags: 64 });

    let gifUrl = null;
    try {
        const res = await fetch(`https://api.waifu.pics/sfw/${rpCfg.endpoint}`);
        const data = await res.json();
        gifUrl = data.url;
    } catch { /* ignora erro da API externa */ }

    const marriageManager = require('@utils/managers/marriageManager');
    const gainedAffinity = await marriageManager.addAffinityIfMarried(interaction.user.id, originalUserId, interaction.guildId, 2);
    let extraMsg = gainedAffinity ? '\n❤️ *Afinidade do casamento +2 (Retribuição)*' : '';

    const embed = new EmbedBuilder()
        .setColor(rpCfg.color)
        .setDescription(`${rpCfg.emoji} <@${allowedUserId}> ${rpCfg.label} <@${originalUserId}>!${extraMsg}`)
        .setFooter(olympusFooter())
        .setTimestamp();

    if (gifUrl) embed.setImage(gifUrl);

    // Desativa o botão original
    await interaction.update({ components: [] }).catch(() => {});
    return interaction.followUp({ embeds: [embed] });
}

// ── Botões de Mines ───────────────────────────────────────────
async function handleMinesButton(interaction) {
    const [, idxStr, ownerId] = interaction.customId.split(':');
    if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: '❌ Esta não é sua partida!', flags: 64 });
    }

    const minesModule = require('@commands/fun/mines');
    const { games, getMultiplier, buildGrid, buildCollectRow, BOMB_COUNT, GRID_ROWS, GRID_COLS } = minesModule;
    const economyManager = require('@utils/managers/economyManager');

    const game = games.get(ownerId);
    if (!game) return interaction.reply({ content: '❌ Partida não encontrada. Inicie com `/mines`.', flags: 64 });

    const config = await economyManager.getConfig(game.guildId);

    // Botão de coletar ganhos
    if (idxStr === 'collect') {
        if (game.revealed.size === 0) {
            return interaction.reply({ content: '❌ Revele pelo menos uma casa antes de coletar!', flags: 64 });
        }

        const winnings = Math.floor(game.bet * game.multiplier);
        await economyManager.addBalance(ownerId, game.guildId, winnings);
        games.delete(ownerId);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('💰 Ganhos Coletados!')
            .setDescription(`Multiplicador: **${game.multiplier}x**\nVocê coletou **${winnings} ${config.currencySymbol}**!`)
            .setFooter(olympusFooter())
            .setTimestamp();

        const grid = buildGrid(game, true);
        grid.push(buildCollectRow(ownerId, true));
        return interaction.update({ embeds: [embed], components: grid });
    }

    const idx = parseInt(idxStr);

    // Bomba!
    if (game.bombs.has(idx)) {
        games.delete(ownerId);
        const embed = new EmbedBuilder()
            .setColor(PALETTE.error)
            .setTitle('💣 BOOM! Você perdeu!')
            .setDescription(`Você acertou uma bomba e perdeu **${game.bet} ${config.currencySymbol}**!`)
            .setFooter(olympusFooter())
            .setTimestamp();
        const grid = buildGrid(game, true);
        grid.push(buildCollectRow(ownerId, true));
        return interaction.update({ embeds: [embed], components: grid });
    }

    // Seguro
    game.revealed.add(idx);
    game.multiplier = getMultiplier(game.revealed.size, GRID_ROWS * GRID_COLS - BOMB_COUNT);
    const winnings = Math.floor(game.bet * game.multiplier);

    // Verificar se revelou tudo (todas as casas seguras)
    const totalSafe = GRID_ROWS * GRID_COLS - BOMB_COUNT;
    if (game.revealed.size >= totalSafe) {
        games.delete(ownerId);
        await economyManager.addBalance(ownerId, game.guildId, winnings);
        const embed = new EmbedBuilder()
            .setColor(PALETTE.success)
            .setTitle('🎉 Incrível! Todas as casas seguras!')
            .setDescription(`Multiplicador: **${game.multiplier}x**\nVocê ganhou **${winnings} ${config.currencySymbol}**!`)
            .setFooter(olympusFooter())
            .setTimestamp();
        const grid = buildGrid(game, true);
        grid.push(buildCollectRow(ownerId, true));
        return interaction.update({ embeds: [embed], components: grid });
    }

    const embed = new EmbedBuilder()
        .setColor(PALETTE.primary)
        .setTitle('💣 Mines — Campo Minado')
        .setDescription(`Aposta: **${game.bet} ${config.currencySymbol}**\nMultiplicador: **${game.multiplier}x**\nGanho atual: **${winnings} ${config.currencySymbol}**\n\n💎 Casas reveladas: ${game.revealed.size}/${totalSafe}`)
        .setFooter(olympusFooter())
        .setTimestamp();

    const grid = buildGrid(game);
    grid.push(buildCollectRow(ownerId, false));
    return interaction.update({ embeds: [embed], components: grid });
}

// ── Modal do Perfil ───────────────────────────────────────────
async function handleProfileModal(interaction) {
    const UserData = require('@models/UserData');
    const bio = interaction.fields.getTextInputValue('perfil_bio') || null;
    const thumbnail = interaction.fields.getTextInputValue('perfil_thumbnail') || null;
    const image = interaction.fields.getTextInputValue('perfil_image') || null;

    const update = {};
    if (bio !== null) update['profile.bio'] = bio;
    if (thumbnail !== null) update['profile.thumbnail'] = thumbnail;
    if (image !== null) update['profile.image'] = image;

    await UserData.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guildId },
        { $set: update },
        { upsert: true }
    );

    return interaction.reply({ content: '✅ Perfil atualizado com sucesso! Use `/perfil ver` para conferir.', flags: 64 });
}

// ── Tratamento seguro de erros ────────────────────────────────
async function replyError(interaction, err) {
    const embed = new EmbedBuilder()
        .setColor(PALETTE.error)
        .setTitle('Erro Inesperado')
        .setDescription('Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.')
        .setFooter(olympusFooter())
        .setTimestamp();

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [embed], flags: 64 });
        } else {
            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    } catch { /* interação já expirou ou não pode responder */ }
}
