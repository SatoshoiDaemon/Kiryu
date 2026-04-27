// src/handlers/commandHandler.js
// ============================================================
//   Olympus Community Bot — Carregador de Comandos
// ============================================================

const fs   = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
const logger = require('@utils/logger');

/**
 * Carrega todos os comandos recursivamente da pasta de comandos.
 * @param {Client} client
 */
function loadCommands(client) {
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, '../commands');
    const commandData  = [];

    const loadDir = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                loadDir(fullPath);
            } else if (entry.name.endsWith('.js')) {
                try {
                    const command = require(fullPath);
                    if (!command.data || !command.execute) {
                        logger.warn(`⚠️ Comando inválido ignorado: ${fullPath}`);
                        continue;
                    }
                    client.commands.set(command.data.name, command);
                    commandData.push(command.data.toJSON());
                    logger.info(`📦 Comando carregado: /${command.data.name}`);
                } catch (err) {
                    logger.error(`❌ Erro ao carregar comando ${fullPath}: ${err.message}`);
                }
            }
        }
    };

    loadDir(commandsPath);
    logger.success(`✅ ${client.commands.size} comandos carregados.`);
    return commandData;
}

/**
 * Registra os comandos na API do Discord.
 * @param {Client} client
 * @param {Array} commandData
 */
async function registerCommands(client, commandData) {
    const token   = process.env.DISCORD_TOKEN;
    const devGuild = process.env.DEV_GUILD_ID;
    const rest    = new REST({ version: '10' }).setToken(token);

    try {
        if (devGuild) {
            // Registro em servidor específico (instantâneo, para desenvolvimento)
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, devGuild),
                { body: commandData }
            );
            logger.success(`✅ Comandos registrados no servidor de dev (${devGuild}).`);
        } else {
            // Registro global (pode levar até 1 hora para propagar)
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commandData }
            );
            logger.success(`✅ Comandos registrados globalmente (${commandData.length} comandos).`);
        }
    } catch (err) {
        if (err.status === 429) {
            const retry = err.response?.headers?.['retry-after'] || 30;
            logger.warn(`⏳ Rate limit ao registrar comandos. Tentando em ${retry}s...`);
            setTimeout(() => registerCommands(client, commandData), retry * 1000);
        } else {
            logger.error(`❌ Erro ao registrar comandos: ${err.message}`);
        }
    }
}

module.exports = { loadCommands, registerCommands };
