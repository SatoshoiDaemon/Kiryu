// src/commands/utility/instafeed.js
// ============================================================
//   Olympus Community Bot — Comando /instafeed
//   Permite postar imagens diretas no canal de instafeed
// ============================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('instafeed')
        .setDescription('📸 Compartilhe uma foto no feed do servidor.')
        .addAttachmentOption(option =>
            option.setName('imagem')
                .setDescription('A imagem que você quer postar')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('legenda')
                .setDescription('A legenda do seu post')
                .setRequired(false)
                .setMaxLength(500)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const guildDoc = await Guild.findOne({ guildId });
        const config = guildDoc?.instafeedConfig;

        if (!config?.enabled || !config.channelId) {
            return interaction.reply({ content: '❌ O sistema de instafeed não está configurado neste servidor.', flags: 64 });
        }

        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (!channel) {
            return interaction.reply({ content: '❌ O canal do Instafeed não foi encontrado ou foi excluído.', flags: 64 });
        }

        // Verifica cargo obrigatório
        if (config.requiredRole) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (!member.roles.cache.has(config.requiredRole)) {
                return interaction.reply({
                    content: `❌ Você precisa do cargo <@&${config.requiredRole}> para postar no instafeed.`,
                    flags: 64,
                });
            }
        }

        const imagem = interaction.options.getAttachment('imagem');
        const legenda = interaction.options.getString('legenda') || '';

        // Validação se é imagem
        if (!imagem.contentType || !imagem.contentType.startsWith('image/')) {
             return interaction.reply({ content: '❌ Por favor, anexe um arquivo de imagem válido (PNG, JPG, GIF).', flags: 64 });
        }

        const branding = await brandingManager.get(guildId);

        const embed = new EmbedBuilder()
            .setColor(branding.accent || PALETTE.accent)
            .setAuthor({ name: `@${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTitle('📸 Post no Instafeed')
            .setImage(imagem.url)
            .setFooter(olympusFooter())
            .setTimestamp();
            
        if (legenda) {
            embed.setDescription(`**${interaction.user.username}** ${legenda}`);
        }

        await channel.send({ embeds: [embed] });
        return interaction.reply({ content: '✅ Seu post foi publicado no instafeed com sucesso!', flags: 64 });
    },
};
