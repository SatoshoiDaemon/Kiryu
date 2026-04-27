// src/commands/utility/serverinfo.js
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servidor')
        .setDescription('🏘️ Exibe informações sobre o servidor atual.'),

    async execute(interaction) {
        const { guild } = interaction;
        
        const owner = await guild.fetchOwner();
        
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const totalRoles = guild.roles.cache.size;
        const emojisCount = guild.emojis.cache.size;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostLevel = guild.premiumTier;
        
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`Informações do Servidor: ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 1024, dynamic: true }))
            .setImage(guild.bannerURL({ size: 1024, dynamic: true }) || null)
            .addFields(
                { name: '👑 Dono', value: `${owner.user} (\`${owner.user.id}\`)`, inline: true },
                { name: '📅 Criado em', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: true },
                { name: '👥 Membros', value: `${guild.memberCount}`, inline: true },
                { name: '💬 Canais', value: `Texto: **${textChannels}**\nVoz: **${voiceChannels}**`, inline: true },
                { name: '🎭 Cargos', value: `${totalRoles}`, inline: true },
                { name: '😎 Emojis', value: `${emojisCount}`, inline: true },
                { name: '🚀 Boosts', value: `Nível ${boostLevel} (${boostCount} boosts)`, inline: true },
                { name: '🆔 ID do Servidor', value: `\`${guild.id}\``, inline: true }
            )
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
