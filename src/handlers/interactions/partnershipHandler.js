// src/handlers/interactions/partnershipHandler.js
// ============================================================
//   Olympus Community Bot — Handler de Parcerias
//   Gerencia modais e botões de aprovação/recusa de parcerias
// ============================================================

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');
const logger = require('@utils/logger');

// ── Handler do modal de candidatura ──────────────────────────
async function handlePartnershipModal(interaction) {
    const guildId = interaction.guildId;
    const guildDoc = await Guild.findOne({ guildId });
    const config = guildDoc?.partnershipsConfig;

    if (!config?.analysisChannel) {
        return interaction.reply({ content: '❌ O canal de análise de parcerias não está configurado.', flags: 64 });
    }

    const analysisChannel = interaction.guild.channels.cache.get(config.analysisChannel);
    if (!analysisChannel) {
        return interaction.reply({ content: '❌ Canal de análise de parcerias não encontrado.', flags: 64 });
    }

    const serverName = interaction.fields.getTextInputValue('partner_server_name');
    const inviteLink = interaction.fields.getTextInputValue('partner_invite_link');
    const memberCount = interaction.fields.getTextInputValue('partner_member_count');
    const description = interaction.fields.getTextInputValue('partner_description');

    const branding = await brandingManager.get(guildId);

    const embed = new EmbedBuilder()
        .setColor(branding.accent || PALETTE.accent)
        .setTitle('🤝 Nova Candidatura de Parceria')
        .addFields(
            { name: '📋 Servidor', value: serverName, inline: true },
            { name: '👥 Membros', value: memberCount, inline: true },
            { name: '🔗 Convite', value: inviteLink, inline: true },
            { name: '📝 Descrição', value: description, inline: false },
            { name: '👤 Enviado por', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false },
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter(olympusFooter('Candidatura pendente de análise'))
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`partnership:accept:${interaction.user.id}`)
            .setLabel('✅ Aceitar')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`partnership:decline:${interaction.user.id}`)
            .setLabel('❌ Recusar')
            .setStyle(ButtonStyle.Danger),
    );

    // Notifica o cargo de notificação se configurado
    let notifyContent = null;
    if (config.notifyRole) {
        notifyContent = `<@&${config.notifyRole}> — Nova candidatura de parceria para análise!`;
    }

    await analysisChannel.send({ content: notifyContent, embeds: [embed], components: [row] });
    return interaction.reply({ content: '✅ Sua candidatura de parceria foi enviada para análise!', flags: 64 });
}

// ── Handler dos botões de aprovação/recusa ───────────────────
async function handlePartnershipButton(interaction) {
    const [, action, applicantId] = interaction.customId.split(':');
    const guildId = interaction.guildId;

    const guildDoc = await Guild.findOne({ guildId });
    const config = guildDoc?.partnershipsConfig;

    // Verifica se quem clicou tem o staffRole
    if (config?.staffRole) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!member.roles.cache.has(config.staffRole) && !member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ Apenas membros com o cargo de staff podem aprovar/recusar parcerias.', flags: 64 });
        }
    }

    if (action === 'accept') {
        // Dá o cargo de parceiro ao candidato
        if (config?.partnerRole) {
            try {
                const applicant = await interaction.guild.members.fetch(applicantId);
                await applicant.roles.add(config.partnerRole);
            } catch (err) {
                logger.warn(`Não foi possível adicionar cargo de parceiro: ${err.message}`);
            }
        }

        // Anuncia no canal de anúncios
        if (config?.announcementChannel) {
            const announceChannel = interaction.guild.channels.cache.get(config.announcementChannel);
            if (announceChannel) {
                // Extrai dados do embed original
                const originalEmbed = interaction.message.embeds[0];
                const serverName = originalEmbed?.fields?.find(f => f.name === '📋 Servidor')?.value || 'Desconhecido';
                const inviteLink = originalEmbed?.fields?.find(f => f.name === '🔗 Convite')?.value || '';
                const description = originalEmbed?.fields?.find(f => f.name === '📝 Descrição')?.value || '';

                const branding = await brandingManager.get(guildId);
                const announceEmbed = new EmbedBuilder()
                    .setColor(branding.accent || PALETTE.success)
                    .setTitle('🤝 Nova Parceria!')
                    .setDescription(
                        `Temos uma nova parceria com **${serverName}**! 🎉\n\n` +
                        `${description}\n\n` +
                        `🔗 **Acesse:** ${inviteLink}`
                    )
                    .setFooter(olympusFooter())
                    .setTimestamp();

                await announceChannel.send({ embeds: [announceEmbed] });
            }
        }

        // Atualiza o embed original
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(PALETTE.success)
            .setFooter(olympusFooter(`✅ Aceita por ${interaction.user.tag}`));

        await interaction.update({ embeds: [updatedEmbed], components: [] });
    }

    if (action === 'decline') {
        // Atualiza o embed original
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(PALETTE.error)
            .setFooter(olympusFooter(`❌ Recusada por ${interaction.user.tag}`));

        await interaction.update({ embeds: [updatedEmbed], components: [] });

        // Tenta notificar o candidato via DM
        try {
            const applicant = await interaction.client.users.fetch(applicantId);
            await applicant.send({
                content: `❌ Sua candidatura de parceria no servidor **${interaction.guild.name}** foi recusada.`,
            }).catch(() => null);
        } catch { /* ignore */ }
    }
}

module.exports = {
    handlePartnershipModal,
    handlePartnershipButton,
};
