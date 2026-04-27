// src/utils/logger.js
// ============================================================
//   Tengoku Community Bot — Sistema de Logs
// ============================================================

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'tengoku.log');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const COLORS = {
    INFO:    '\x1b[36m',  // Ciano
    SUCCESS: '\x1b[32m',  // Verde
    WARN:    '\x1b[33m',  // Amarelo
    ERROR:   '\x1b[31m',  // Vermelho
    RESET:   '\x1b[0m',
    DIM:     '\x1b[2m',
};

const DISCORD_COLORS = {
    INFO:    3447003,   // Azul
    SUCCESS: 5763719,   // Verde
    WARN:    16119101,  // Amarelo
    ERROR:   15158332,  // Vermelho
};

const webhookUrl   = process.env.DISCORD_WEBHOOK_URL;
const sendDiscord  = process.env.SEND_TO_DISCORD === 'true';

const messageQueue = [];
let isProcessing   = false;

function timestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function writeToFile(level, message) {
    const line = `[${timestamp()}] [${level.padEnd(7)}] ${message}\n`;
    fs.appendFile(LOG_FILE, line, () => {});
}

function writeToConsole(level, message) {
    const color = COLORS[level] || COLORS.RESET;
    const dim   = COLORS.DIM;
    const reset = COLORS.RESET;
    console.log(`${dim}[${timestamp()}]${reset} ${color}[${level.padEnd(7)}]${reset} ${message}`);
}

async function processQueue() {
    if (isProcessing || messageQueue.length === 0 || !sendDiscord || !webhookUrl) return;
    isProcessing = true;

    const batch = messageQueue.splice(0, 5);
    for (const { level, message } of batch) {
        try {
            await axios.post(webhookUrl, {
                embeds: [{
                    title: `📋 ${level}`,
                    description: `\`\`\`${message}\`\`\``,
                    color: DISCORD_COLORS[level] || DISCORD_COLORS.INFO,
                    footer: { text: 'Tengoku Bot — Sistema de Logs' },
                    timestamp: new Date().toISOString(),
                }]
            });
        } catch (_) { /* silencia erros de webhook */ }
    }

    isProcessing = false;
    if (messageQueue.length > 0) setTimeout(processQueue, 2000);
}

function log(level, message) {
    writeToConsole(level, message);
    writeToFile(level, message);

    if (sendDiscord && webhookUrl) {
        messageQueue.push({ level, message });
        if (!isProcessing) processQueue();
    }
}

const logger = {
    info:    (msg) => log('INFO',    msg),
    success: (msg) => log('SUCCESS', msg),
    warn:    (msg) => log('WARN',    msg),
    error:   (msg) => log('ERROR',   msg),
};

module.exports = logger;
