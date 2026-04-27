// src/commands/utility/botinfo.js
const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('🤖 Exibe informações técnicas e estatísticas do bot.'),

    async execute(interaction) {
        const client = interaction.client;
        
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const ping = client.ws.ping;
        
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle('🤖 Informações do Olympus')
            .setThumbnail(client.user.displayAvatarURL({ size: 1024 }))
            .addFields(
                { name: '📊 Servidores', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 Usuários', value: `${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`, inline: true },
                { name: '📡 Ping da API', value: `${ping}ms`, inline: true },
                { name: '💾 Memória (RAM)', value: `${memoryUsage} MB / ${totalMemory} GB`, inline: true },
                { name: '⏱️ Tempo Online', value: `${days}d ${hours}h ${minutes}m`, inline: true },
                { name: '⚙️ Engine', value: `Node.js ${process.version}\nDiscord.js v${djsVersion}`, inline: true }
            )
            .setFooter(olympusFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
