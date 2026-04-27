const { AttachmentBuilder } = require('discord.js');

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildTranscriptHtml(channelName, messages) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Ticket Transcript — ${escapeHtml(channelName)}</title>
<style>
    body { background: #0f172a; color: #e2e8f0; font-family: Inter, system-ui, sans-serif; margin: 0; padding: 16px; }
    .header { margin-bottom: 24px; }
    .header h1 { margin: 0; color: #7c3aed; }
    .message { padding: 12px 14px; margin-bottom: 12px; border-radius: 14px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(114, 106, 255, 0.18); }
    .meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
    .author { font-weight: 700; color: #f8fafc; }
    .timestamp { font-size: 0.9rem; color: #cbd5e1; }
    .content { white-space: pre-wrap; word-break: break-word; font-size: 0.96rem; color: #e2e8f0; }
</style>
</head>
<body>
    <div class="header">
        <h1>Transcript do ticket</h1>
        <p>Canal: ${escapeHtml(channelName)}</p>
        <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    </div>
    ${messages.map(message => `
        <div class="message">
            <div class="meta">
                <span class="author">${escapeHtml(message.authorTag)}</span>
                <span class="timestamp">${escapeHtml(message.timestamp)}</span>
            </div>
            <div class="content">${escapeHtml(message.content)}</div>
        </div>
    `).join('')}
</body>
</html>`;
}

async function generateTicketTranscript(channel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const ordered = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const transcriptMessages = ordered.map(msg => ({
        authorTag: `${msg.author.username}#${msg.author.discriminator}`,
        timestamp: msg.createdAt.toLocaleString('pt-BR'),
        content: msg.content || (msg.embeds.length ? '[Embed]' : '[Mensagem sem texto]'),
    }));

    const html = buildTranscriptHtml(channel.name, transcriptMessages);
    const buffer = Buffer.from(html, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `ticket-${channel.name}-transcript.html` });
    return attachment;
}

module.exports = { generateTicketTranscript };
