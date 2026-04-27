// src/commands/admin/emoji.js
// ============================================================
//   Tengoku Community Bot — Gerenciamento de Emojis
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('😀 Gerencia e visualiza emojis do servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addSubcommand(sub => sub.setName('add').setDescription('➕ Adiciona um emoji usando uma URL ou arquivo')
            .addStringOption(o => o.setName('nome').setDescription('Nome do emoji sem os dois pontos').setRequired(true))
            .addAttachmentOption(o => o.setName('arquivo').setDescription('Arquivo de imagem ou gif').setRequired(false))
            .addStringOption(o => o.setName('link').setDescription('Ou link direto da imagem').setRequired(false)))
        .addSubcommand(sub => sub.setName('info').setDescription('ℹ️ Exibe informações sobre um emoji do servidor')
            .addStringOption(o => o.setName('emoji').setDescription('O emoji nativo ou ID (ex: <:nome:ID> ou apenas ID)').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            await interaction.deferReply();
            const name = interaction.options.getString('nome').replace(/[^a-zA-Z0-9_]/g, '');
            const attachment = interaction.options.getAttachment('arquivo');
            const link = interaction.options.getString('link');

            const url = attachment ? attachment.url : link;

            if (!url) {
                return interaction.editReply({ content: '❌ Você precisa fornecer um **arquivo** ou um **link válido**!' });
            }

            if (name.length < 2 || name.length > 32) {
                return interaction.editReply({ content: '❌ O nome do emoji deve ter entre 2 e 32 caracteres.' });
            }

            try {
                const emoji = await interaction.guild.emojis.create({ attachment: url, name: name });

                const embed = new EmbedBuilder()
                    .setColor(PALETTE.success)
                    .setTitle('😀 Emoji Adicionado')
                    .setDescription(`Emoji ${emoji} foi adicionado com sucesso!\n\n**Código:** \`<:${emoji.name}:${emoji.id}>\``)
                    .setThumbnail(emoji.url)
                    .setFooter(tengokuFooter())
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                return interaction.editReply({ content: `❌ Falha ao tentar adicionar o emoji: \`${err.message}\`` });
            }
        }

        if (sub === 'info') {
            const emojiInput = interaction.options.getString('emoji');
            
            // Tenta extrair ID do input via regex <:name:id> ou apenas string de numeros
            const match = emojiInput.match(/(?:<a?:)?\w+:(\d{17,20})>?/) || emojiInput.match(/^(\d{17,20})$/);
            
            if (!match) {
                return interaction.reply({ content: '❌ Formato de emoji inválido. Envie um emoji customizado ou o ID.', flags: 64 });
            }

            const emojiId = match[1];
            const emoji = interaction.guild.emojis.cache.get(emojiId);

            if (!emoji) {
                return interaction.reply({ content: '❌ Emoji não encontrado *neste* servidor.', flags: 64 });
            }

            // Tenta buscar o autor original
            let authorName = 'Desconhecido';
            try {
                const fetchedEmoji = await emoji.fetchAuthor();
                authorName = `${fetchedEmoji.toString()} (\`${fetchedEmoji.id}\`)`;
            } catch { /* Ignora se não houver permissões */ }

            const embed = new EmbedBuilder()
                .setColor(PALETTE.primary)
                .setTitle(`📌 Informações do Emoji: ${emoji.name}`)
                .addFields(
                    { name: '😀 Exibição', value: emoji.toString(), inline: true },
                    { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true },
                    { name: '👤 Criado por', value: authorName, inline: false },
                    { name: '🎬 Animado?', value: emoji.animated ? '✅ Sim' : '❌ Não', inline: true },
                    { name: '📅 Criado em', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:F>`, inline: false },
                    { name: '🔗 Link', value: `[Clique aqui para baixar](${emoji.url})`, inline: false }
                )
                .setThumbnail(emoji.url)
                .setFooter(tengokuFooter())
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    },
};
