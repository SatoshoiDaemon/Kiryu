// src/events/interaction/helpHandler.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');
const { CATEGORIES } = require('@commands/utility/ajuda');
const economyManager = require('@utils/managers/economyManager');
const Guild = require('@models/Guild');
const Marriage = require('@models/Marriage');
const Suggestion = require('@models/Suggestion');

async function handleHelpSelect(interaction) {
    const category = interaction.values[0];
    const data = CATEGORIES[category];
    if (!data) return;

    const branding = await brandingManager.get(interaction.guildId);
    const color = branding.accent || PALETTE.accent;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(data.title)
        .setDescription(
            data.commands.map(c => `**${c.name}**\n> ${c.desc}`).join('\n\n')
        )
        .setFooter(olympusFooter('Use / para executar qualquer comando'))
        .setTimestamp();

    const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help:back')
            .setLabel('← Voltar')
            .setStyle(ButtonStyle.Secondary)
    );

    return interaction.update({ embeds: [embed], components: [backRow] });
}

async function handleHelpBack(interaction) {
    const { version } = require('../../../package.json');
    const branding = await brandingManager.get(interaction.guildId);
    const color = branding.accent || PALETTE.accent;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('📖 Central de Ajuda')
        .setDescription(
            `Bem-vindo(a) à central de ajuda!\n\n` +
            `Use o menu abaixo para navegar pelas categorias de comandos.\n` +
            `Todos os comandos são executados via **/**.\n\n` +
            `> Desenvolvido por **Olympus Studio** — v${version}`
        )
        .addFields(
            { name: '⚙️ Administração', value: 'Configuração, moderação e gerenciamento', inline: true },
            { name: '💰 Economia', value: 'Moedas, daily, trabalho e banco', inline: true },
            { name: '⭐ Utilidades', value: 'XP, ranking e informações', inline: true },
            { name: '🎮 Diversão', value: 'Blackjack e roleta', inline: true },
            { name: '💙 Social', value: 'Interações sociais', inline: true },
        )
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter(olympusFooter(`v${version}`))
        .setTimestamp();

    const menu = new StringSelectMenuBuilder()
        .setCustomId('help:category')
        .setPlaceholder('Selecione uma categoria...')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('⚙️ Administração').setValue('admin').setDescription('Configuração e moderação').setEmoji('⚙️'),
            new StringSelectMenuOptionBuilder().setLabel('💰 Economia').setValue('economy').setDescription('Moedas, daily e trabalho').setEmoji('💰'),
            new StringSelectMenuOptionBuilder().setLabel('⭐ Utilidades').setValue('utility').setDescription('XP, ranking e informações').setEmoji('⭐'),
            new StringSelectMenuOptionBuilder().setLabel('🎮 Diversão').setValue('fun').setDescription('Jogos e entretenimento').setEmoji('🎮'),
            new StringSelectMenuOptionBuilder().setLabel('💙 Social').setValue('social').setDescription('Interações sociais').setEmoji('💙'),
        );

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({ embeds: [embed], components: [row] });
}

// ── Handler de casamento ──────────────────────────────────────
async function handleMarriageButton(interaction) {
    const [, action, proposerId, targetId] = interaction.customId.split(':');

    if (interaction.user.id !== targetId) {
        return interaction.reply({ content: '❌ Este pedido não é para você!', flags: 64 });
    }

    const guildId = interaction.guildId;

    if (action === 'accept') {
        const exists = await Marriage.findOne({ 
            guildId, 
            $or: [{ user1Id: proposerId }, { user2Id: proposerId }, { user1Id: targetId }, { user2Id: targetId }] 
        });

        if (exists) {
            return interaction.reply({ content: '❌ Pelo menos um de vocês já está casado neste servidor.', flags: 64 });
        }

        await Marriage.create({ guildId, user1Id: proposerId, user2Id: targetId });

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle('💍 Casamento Realizado!')
            .setDescription(`<@${proposerId}> e <@${targetId}> agora estão casados! 🎊`)
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.update({ embeds: [embed], components: [] });
    }

    if (action === 'decline') {
        const embed = new EmbedBuilder()
            .setColor(PALETTE.error)
            .setTitle('💔 Pedido Recusado')
            .setDescription(`<@${targetId}> recusou o pedido de casamento de <@${proposerId}>.`)
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.update({ embeds: [embed], components: [] });
    }
}

// ── Handler de blackjack ──────────────────────────────────────
async function handleBlackjackButton(interaction) {
    const bjModule = require('@commands/fun/blackjack');
    const games = bjModule.games;
    const handValue = bjModule.handValue;
    const formatHand = bjModule.formatHand;

    const [, action, userId] = interaction.customId.split(':');

    if (interaction.user.id !== userId) {
        return interaction.reply({ content: '❌ Esta não é sua partida de blackjack!', flags: 64 });
    }

    const game = games.get(userId);
    if (!game) {
        return interaction.reply({ content: '❌ Partida não encontrada. Inicie uma nova com `/blackjack`.', flags: 64 });
    }

    const config = await economyManager.getConfig(game.guildId);

    if (action === 'hit') {
        game.playerHand.push(game.deck.pop());
        const playerTotal = handValue(game.playerHand);

        function cardValue(card) {
            if (['J', 'Q', 'K'].includes(card.value)) return 10;
            if (card.value === 'A') return 11;
            return parseInt(card.value);
        }

        if (playerTotal > 21) {
            games.delete(userId);
            const embed = new EmbedBuilder()
                .setColor(PALETTE.error)
                .setTitle('🃏 Blackjack — Bust!')
                .setDescription(`Você passou de 21 e perdeu **${game.aposta} ${config.currencySymbol}**!`)
                .addFields(
                    { name: 'Sua mão', value: `${formatHand(game.playerHand)} = **${playerTotal}**`, inline: true },
                    { name: 'Dealer', value: `${formatHand(game.dealerHand)} = **${handValue(game.dealerHand)}**`, inline: true },
                )
                .setFooter(olympusFooter())
                .setTimestamp();

            return interaction.update({ embeds: [embed], components: [] });
        }

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setTitle('🃏 Blackjack')
            .addFields(
                { name: 'Sua mão', value: `${formatHand(game.playerHand)} = **${playerTotal}**`, inline: true },
                { name: 'Dealer', value: `${formatHand(game.dealerHand, true)} = **${cardValue(game.dealerHand[0])}+?**`, inline: true },
                { name: 'Aposta', value: `${game.aposta} ${config.currencySymbol}`, inline: false },
            )
            .setFooter(olympusFooter())
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bj:hit:${userId}`).setLabel('🃏 Pedir').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`bj:stand:${userId}`).setLabel('✋ Parar').setStyle(ButtonStyle.Secondary),
        );

        return interaction.update({ embeds: [embed], components: [row] });
    }

    if (action === 'stand') {
        // Dealer joga
        while (handValue(game.dealerHand) < 17) {
            game.dealerHand.push(game.deck.pop());
        }

        const playerTotal = handValue(game.playerHand);
        const dealerTotal = handValue(game.dealerHand);
        games.delete(userId);

        let result, color, winnings = 0;
        if (dealerTotal > 21 || playerTotal > dealerTotal) {
            result = `🎉 Você ganhou! **+${game.aposta * 2} ${config.currencySymbol}**`;
            color = PALETTE.success;
            winnings = game.aposta * 2;
            await economyManager.addBalance(userId, game.guildId, winnings);
        } else if (playerTotal === dealerTotal) {
            result = `🤝 Empate! Aposta devolvida: **${game.aposta} ${config.currencySymbol}**`;
            color = PALETTE.info;
            await economyManager.addBalance(userId, game.guildId, game.aposta);
        } else {
            result = `😔 Você perdeu **${game.aposta} ${config.currencySymbol}**.`;
            color = PALETTE.error;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🃏 Blackjack — Resultado')
            .setDescription(result)
            .addFields(
                { name: 'Sua mão', value: `${formatHand(game.playerHand)} = **${playerTotal}**`, inline: true },
                { name: 'Dealer', value: `${formatHand(game.dealerHand)} = **${dealerTotal}**`, inline: true },
            )
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.update({ embeds: [embed], components: [] });
    }
}


// ── Handler de sugestão ───────────────────────────────────────
async function handleSuggestionModal(interaction) {
    const guildId = interaction.guildId;

    let guildDoc = await Guild.findOne({ guildId });
    if (!guildDoc) guildDoc = await Guild.create({ guildId });
    const config = guildDoc.suggestionsConfig || {};

    if (!config?.channelId) return interaction.reply({ content: '❌ Canal de sugestões não configurado.', flags: 64 });

    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (!channel) return interaction.reply({ content: '❌ Canal de sugestões não encontrado.', flags: 64 });

    const content = interaction.fields.getTextInputValue('suggestion_content');
    const branding = await brandingManager.get(guildId);

    const embed = new EmbedBuilder()
        .setColor(branding.accent || PALETTE.accent)
        .setTitle('💡 Nova Sugestão')
        .setDescription(content)
        .addFields({ name: 'Enviado por', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false })
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter(olympusFooter())
        .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react('👍').catch(() => null);
    await msg.react('👎').catch(() => null);

    // Auto-thread se configurado
    if (config.autoThread) {
        try {
            await msg.startThread({
                name: `💡 Sugestão de ${interaction.user.username}`,
                autoArchiveDuration: 1440, // 24 horas
            });
        } catch { /* Ignora se não conseguir criar thread */ }
    }

    // Salva no banco
    await Suggestion.create({
        guildId,
        userId: interaction.user.id,
        content,
        messageId: msg.id
    });

    return interaction.reply({ content: '✅ Sua sugestão foi enviada com sucesso!', flags: 64 });
}

// ── Handler de instafeed ─────────────────────────────────────────────────
async function handleInstafeedModal(interaction) {
    const guildId = interaction.guildId;
    const guildDoc = await Guild.findOne({ guildId });
    const config = guildDoc?.instafeedConfig;

    if (!config?.channelId) {
        return interaction.reply({ content: '❌ Canal de instafeed não configurado.', flags: 64 });
    }

    const channel = interaction.guild.channels.cache.get(config.channelId);
    if (!channel) {
        return interaction.reply({ content: '❌ Canal de instafeed não encontrado.', flags: 64 });
    }

    const url = interaction.fields.getTextInputValue('instafeed_url');
    const caption = interaction.fields.getTextInputValue('instafeed_caption') || null;

    // Valida URL do Instagram
    const INSTAGRAM_REGEX = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i;
    if (!INSTAGRAM_REGEX.test(url)) {
        return interaction.reply({ content: '❌ URL inválida. Envie um link válido do Instagram (post, reel ou IGTV).', flags: 64 });
    }

    const branding = await brandingManager.get(guildId);

    const embed = new EmbedBuilder()
        .setColor(branding.accent || PALETTE.accent)
        .setTitle('📸 Novo Post no InstaFeed')
        .setDescription(
            (caption ? `${caption}\n\n` : '') +
            `🔗 [Ver no Instagram](${url})`
        )
        .addFields(
            { name: '👤 Publicado por', value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: false }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter(olympusFooter())
        .setTimestamp();

    await channel.send({ content: url, embeds: [embed] });
    return interaction.reply({ content: '✅ Seu post foi publicado no instafeed com sucesso!', flags: 64 });
}

module.exports = {
    handleHelpSelect,
    handleHelpBack,
    handleMarriageButton,
    handleBlackjackButton,
    handleSuggestionModal,
    handleInstafeedModal,
};
