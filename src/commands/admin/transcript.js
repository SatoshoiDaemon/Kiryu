// src/commands/admin/transcript.js
// ============================================================
//   Olympus Community Bot — Transcript de Canal em HTML
// ============================================================

const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('📄 Gera um transcript de um canal como arquivo HTML.')
        .addChannelOption(o => o.setName('canal').setDescription('Canal para transcrever').setRequired(true))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade de mensagens (máx 200)').setRequired(false).setMinValue(10).setMaxValue(200))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const channel = interaction.options.getChannel('canal');
        const limit = interaction.options.getInteger('quantidade') || 100;

        if (!channel.isTextBased()) {
            return interaction.editReply({ content: '❌ Selecione um canal de texto.' });
        }

        const messages = await channel.messages.fetch({ limit });
        const sorted = [...messages.values()].reverse();

        const html = generateHTML(sorted, channel, interaction.guild);

        const buffer = Buffer.from(html, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}-${Date.now()}.html` });

        return interaction.editReply({ content: `✅ Transcript gerado com **${sorted.length}** mensagens de <#${channel.id}>.`, files: [attachment] });
    },
};

function generateHTML(messages, channel, guild) {
    const rows = messages.map(msg => {
        const time = msg.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const avatar = msg.author.displayAvatarURL({ size: 64, extension: 'png' });
        const content = escapeHtml(msg.content || '');
        const attachments = msg.attachments.map(a => `<div class="attachment"><a href="${escapeHtml(a.url)}" target="_blank">📎 ${escapeHtml(a.name || 'Anexo')}</a></div>`).join('');
        const embeds = msg.embeds.map(e => `<div class="embed-block"><strong>${escapeHtml(e.title || '')}</strong><br>${escapeHtml(e.description || '')}</div>`).join('');

        return `
        <div class="message">
            <img class="avatar" src="${avatar}" alt="avatar" />
            <div class="body">
                <div class="header">
                    <span class="username" style="color:${msg.member?.displayHexColor || '#FFFFFF'}">${escapeHtml(msg.author.username)}</span>
                    <span class="timestamp">${time}</span>
                </div>
                <div class="content">${content}</div>
                ${attachments}${embeds}
            </div>
        </div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript — #${escapeHtml(channel.name)} | ${escapeHtml(guild.name)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#dcddde;font-family:'Segoe UI',Tahoma,sans-serif;padding:20px;max-width:900px;margin:0 auto}
h1{color:#7b2fff;border-bottom:2px solid #7b2fff;padding-bottom:10px;margin-bottom:20px;font-size:1.4em}
.meta{color:#72767d;font-size:0.85em;margin-bottom:20px}
.message{display:flex;gap:12px;padding:8px 12px;margin:2px 0;border-radius:6px;transition:background 0.1s}
.message:hover{background:#2a2a4a}
.avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;margin-top:4px}
.body{min-width:0;flex:1}
.header{display:flex;align-items:baseline;gap:8px}
.username{font-weight:600;font-size:0.95em}
.timestamp{color:#72767d;font-size:0.75em}
.content{margin-top:2px;white-space:pre-wrap;word-wrap:break-word;line-height:1.4}
.attachment{margin-top:4px;padding:6px 10px;background:#2f3136;border-radius:4px;border-left:3px solid #7b2fff}
.attachment a{color:#00aff4;text-decoration:none}
.embed-block{margin-top:6px;padding:8px 12px;background:#2f3136;border-left:4px solid #7b2fff;border-radius:4px;font-size:0.9em}
</style>
</head>
<body>
<h1>📄 Transcript — #${escapeHtml(channel.name)}</h1>
<p class="meta">Servidor: ${escapeHtml(guild.name)} | ${messages.length} mensagens | Gerado em ${new Date().toLocaleString('pt-BR')}</p>
${rows}
</body>
</html>`;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
