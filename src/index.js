// src/index.js
// ============================================================
//
//    ██████╗ ██╗  ██╗   ██╗███╗   ███╗██████╗ ██╗   ██╗███████╗
//   ██╔═══██╗██║  ╚██╗ ██╔╝████╗ ████║██╔══██╗██║   ██║██╔════╝
//   ██║   ██║██║   ╚████╔╝ ██╔████╔██║██████╔╝██║   ██║███████╗
//   ██║   ██║██║    ╚██╔╝  ██║╚██╔╝██║██╔═══╝ ██║   ██║╚════██║
//   ╚██████╔╝███████╗██║   ██║ ╚═╝ ██║██║     ╚██████╔╝███████║
//    ╚═════╝ ╚══════╝╚═╝   ╚═╝     ╚═╝╚═╝      ╚═════╝ ╚══════╝
//
//   Kiryu — Desenvolvido por Axiom
// ============================================================

// ── Registro dos aliases de módulo (deve ser a primeira instrução) ──
require('module-alias/register');
require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { initializeDatabase } = require('@database');
const { loadCommands, registerCommands } = require('@handlers/commandHandler');
const { loadEvents } = require('@handlers/eventHandler');
const logger = require('@utils/logger');

// ── Criação do cliente Discord ────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildInvites,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
    ],
});

// ── Carregadores de eventos ───────────────────────────────────
// Comandos e outras inicializações baseadas em evento (ready) 
// foram movidos para src/events/client/ready.js

// ── Inicialização ─────────────────────────────────────────────
async function start() {
    try {
        logger.info('🚀 Iniciando Kiryu...');
        logger.info('💜 Desenvolvido por Axiom');

        // Inicializa o banco de dados
        await initializeDatabase();

        // Carrega os eventos
        loadEvents(client);

        // Conecta ao Discord
        await client.login(process.env.DISCORD_TOKEN);

    } catch (err) {
        logger.error(`❌ Erro fatal ao iniciar o bot: ${err.message}`);
        logger.error(err.stack);

        if (err.code === 'TOKEN_INVALID') {
            logger.error('🔑 Token inválido! Verifique DISCORD_TOKEN no arquivo .env');
            process.exit(1);
        }

        logger.warn('⏳ Tentando reiniciar em 15 segundos...');
        setTimeout(start, 15000);
    }
}

// ── Tratamento de erros não capturados ───────────────────────
process.on('unhandledRejection', (reason) => {
    logger.error(`❌ Rejeição não tratada: ${reason}`);
});

process.on('uncaughtException', (err) => {
    logger.error(`❌ Exceção não capturada: ${err.message}`);
    logger.error(err.stack);
});

start();
