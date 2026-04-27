// src/handlers/interactions/embedHandler.js
// ============================================================
//   Tengoku Community Bot — Handler do Construtor de Embeds
// ============================================================

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ChannelType
} = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');
const logger = require('@utils/logger');

// Cache em memória dos rascunhos de embed por usuário
// Formato: userId -> { content: string, embedData: object }
const embedSessions = new Map();

/**
 * Inicia o construtor criando uma sessão vazia e enviando o painel efêmero.
 */
async function startEmbedBuilder(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const branding = await brandingManager.get(guildId);

    // Cria um rascunho inicial
    embedSessions.set(userId, {
        content: null,
        embedData: {
            title: 'Título do Embed',
            description: 'Use os botões abaixo para editar o conteúdo deste embed. Você pode adicionar imagens, mudar a cor, o título e o rodapé.',
            color: branding.accent || PALETTE.accent,
        }
    });

    await updatePanel(interaction, true);
}

/**
 * Atualiza o painel de visualização com o estado salvo na sessão
 */
async function updatePanel(interaction, isInitial = false) {
    const userId = interaction.user.id;
    const session = embedSessions.get(userId);

    if (!session) {
        const msg = { content: '❌ Sessão expirada. Inicie o construtor novamente com `/embed`.', flags: 64 };
        return isInitial ? interaction.reply(msg) : interaction.update({ ...msg, embeds: [], components: [] });
    }

    // Tenta montar o Embed do rascunho
    let previewEmbed;
    try {
        previewEmbed = new EmbedBuilder(session.embedData);
    } catch (e) {
        // Fallback de segurança se falhar na validação do discord.js
        previewEmbed = new EmbedBuilder().setDescription('❌ Erro de formatação no embed. Revise URLs e limites de caracteres.');
    }

    // Botões de edição
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed:edit_basic').setLabel('✏️ Textos e Cor').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('embed:edit_media').setLabel('🖼️ Imagens').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('embed:edit_content').setLabel('💬 Texto Fora (Content)').setStyle(ButtonStyle.Secondary),
    );

    // Seletor de canal (Envia usando o próprio bot)
    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('embed:send_bot')
            .setPlaceholder('📤 Enviar pelo Bot para um Canal...')
            .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
    );

    // Botão de webhook avançado + fechar
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('embed:send_webhook').setLabel('🌐 Enviar via Webhook').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('embed:close').setLabel('❌ Cancelar & Fechar').setStyle(ButtonStyle.Danger),
    );

    const payload = {
        content: session.content ? `**Texto externo:**\n${session.content}\n\n**Visualização do Embed:**` : '**Visualização do Embed:**',
        embeds: [previewEmbed],
        components: [row1, row2, row3],
        flags: 64 // ephemeral = só o autor vê
    };

    if (isInitial) {
        return interaction.reply(payload);
    } else {
        return interaction.update(payload);
    }
}

/**
 * Lida com botões (Abrir modais e fechar)
 */
async function handleEmbedButton(interaction) {
    const id = interaction.customId;
    const userId = interaction.user.id;
    const session = embedSessions.get(userId);

    if (!session && id !== 'embed:close') {
        return interaction.reply({ content: '❌ Sessão expirada. Inicie o construtor novamente.', flags: 64 });
    }

    if (id === 'embed:close') {
        embedSessions.delete(userId);
        return interaction.update({ content: '✅ Construtor encerrado.', embeds: [], components: [] });
    }

    if (id === 'embed:edit_basic') {
        const modal = new ModalBuilder().setCustomId('modal:embed:basic').setTitle('Textos e Cores do Embed');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('title').setLabel('Título').setStyle(TextInputStyle.Short).setRequired(false).setValue(session.embedData.title || '')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('description').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setRequired(false).setValue(session.embedData.description || '')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('color').setLabel('Cor Hexadecimal (ex: #FF0000)').setStyle(TextInputStyle.Short).setRequired(false).setValue(String(session.embedData.color || ''))
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('author').setLabel('Nome do Autor').setStyle(TextInputStyle.Short).setRequired(false).setValue(session.embedData.author?.name || '')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('footer').setLabel('Texto do Rodapé').setStyle(TextInputStyle.Short).setRequired(false).setValue(session.embedData.footer?.text || '')
            ),
        );
        return interaction.showModal(modal);
    }

    if (id === 'embed:edit_media') {
        const modal = new ModalBuilder().setCustomId('modal:embed:media').setTitle('Imagens do Embed');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('thumbnail').setLabel('URL da Thumbnail (Direita)').setStyle(TextInputStyle.Short).setRequired(false).setValue(session.embedData.thumbnail?.url || '')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('image').setLabel('URL da Imagem Maior (Fundo)').setStyle(TextInputStyle.Short).setRequired(false).setValue(session.embedData.image?.url || '')
            ),
        );
        return interaction.showModal(modal);
    }

    if (id === 'embed:edit_content') {
        const modal = new ModalBuilder().setCustomId('modal:embed:content').setTitle('Texto Fora do Embed');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Conteúdo (suporta <@&ID> e links)').setStyle(TextInputStyle.Paragraph).setRequired(false).setValue(session.content || '')
            )
        );
        return interaction.showModal(modal);
    }

    if (id === 'embed:send_webhook') {
        const modal = new ModalBuilder().setCustomId('modal:embed:webhook').setTitle('Disparar Webhook');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('webhook_url').setLabel('URL do Webhook (obrigatório)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('https://discord.com/api/webhooks/...')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('webhook_name').setLabel('Nome Sobrescrito do Webhook').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Tengoku Avisos')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('webhook_avatar').setLabel('URL do Avatar do Webhook').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('https://i.imgur.com/...')
            ),
        );
        return interaction.showModal(modal);
    }
}

/**
 * Lida com seletores (Envio pelo bot)
 */
async function handleEmbedSelect(interaction) {
    const id = interaction.customId;
    const userId = interaction.user.id;
    const session = embedSessions.get(userId);

    if (!session) {
        return interaction.reply({ content: '❌ Sessão expirada. Inicie o construtor novamente.', flags: 64 });
    }

    if (id === 'embed:send_bot') {
        const channelId = interaction.values[0];
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            return interaction.reply({ content: '❌ Canal não encontrado.', flags: 64 });
        }

        try {
            const embed = new EmbedBuilder(session.embedData);
            await channel.send({ content: session.content, embeds: [embed] });
            
            embedSessions.delete(userId); // Limpa sessão
            return interaction.update({ content: `✅ Mensagem enviada com sucesso para ${channel}!`, embeds: [], components: [] });
        } catch (err) {
            return interaction.reply({ content: `❌ Falha ao enviar: ${err.message}`, flags: 64 });
        }
    }
}

/**
 * Lida com submissões de modais
 */
async function handleEmbedModal(interaction) {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    const session = embedSessions.get(userId);

    if (!session) {
        return interaction.reply({ content: '❌ Sessão expirada. Inicie o construtor novamente.', flags: 64 });
    }

    if (customId === 'modal:embed:basic') {
        const d = session.embedData;
        const colorInput = interaction.fields.getTextInputValue('color');
        
        // Formata e recupera dados
        if (interaction.fields.getTextInputValue('title')) d.title = interaction.fields.getTextInputValue('title');
        else delete d.title;

        if (interaction.fields.getTextInputValue('description')) d.description = interaction.fields.getTextInputValue('description');
        else delete d.description;

        if (colorInput) {
            const parsedColor = parseInt(colorInput.replace('#', ''), 16);
            if (!isNaN(parsedColor)) d.color = parsedColor;
        }

        const authorInput = interaction.fields.getTextInputValue('author');
        if (authorInput) {
            if (!d.author) d.author = {};
            d.author.name = authorInput;
        } else delete d.author;

        const footerInput = interaction.fields.getTextInputValue('footer');
        if (footerInput) {
            if (!d.footer) d.footer = {};
            d.footer.text = footerInput;
        } else delete d.footer;

        return updatePanel(interaction, false);
    }

    if (customId === 'modal:embed:media') {
        const d = session.embedData;
        
        const thumbInput = interaction.fields.getTextInputValue('thumbnail');
        if (thumbInput) {
            if (!d.thumbnail) d.thumbnail = {};
            d.thumbnail.url = thumbInput;
        } else delete d.thumbnail;

        const imgInput = interaction.fields.getTextInputValue('image');
        if (imgInput) {
            if (!d.image) d.image = {};
            d.image.url = imgInput;
        } else delete d.image;

        return updatePanel(interaction, false);
    }

    if (customId === 'modal:embed:content') {
        session.content = interaction.fields.getTextInputValue('content') || null;
        return updatePanel(interaction, false);
    }

    if (customId === 'modal:embed:webhook') {
        const webhookUrl = interaction.fields.getTextInputValue('webhook_url');
        const webhookName = interaction.fields.getTextInputValue('webhook_name');
        const webhookAvatar = interaction.fields.getTextInputValue('webhook_avatar');

        try {
            // Formata os dados pro payload raw da API do discord
            const payload = {
                embeds: [session.embedData],
            };
            
            if (session.content) payload.content = session.content;
            if (webhookName) payload.username = webhookName;
            if (webhookAvatar) payload.avatar_url = webhookAvatar;

            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                return interaction.reply({ content: `❌ Falha da API do Discord ao enviar Webhook: \`${JSON.stringify(errData)}\``, flags: 64 });
            }

            embedSessions.delete(userId); // Limpa
            return interaction.update({ content: `✅ Mensagem enviada com sucesso via Webhook!`, embeds: [], components: [] });

        } catch (err) {
            return interaction.reply({ content: `❌ Falha ao tentar POST no Webhook: \`${err.message}\``, flags: 64 });
        }
    }
}

module.exports = {
    startEmbedBuilder,
    handleEmbedButton,
    handleEmbedSelect,
    handleEmbedModal
};
