// src/handlers/eventHandler.js
// ============================================================
//   Tengoku Community Bot — Carregador de Eventos
// ============================================================

const fs   = require('fs');
const path = require('path');
const logger = require('@utils/logger');

/**
 * Carrega todos os eventos recursivamente da pasta de eventos.
 * @param {Client} client
 */
function loadEvents(client) {
    const eventsPath = path.join(__dirname, '../events');
    let count = 0;

    const loadDir = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                loadDir(fullPath);
            } else if (entry.name.endsWith('.js')) {
                try {
                    const event = require(fullPath);

                    // Suporta arquivos que exportam um array de eventos
                    const events = Array.isArray(event) ? event : [event];

                    for (const ev of events) {
                        if (!ev.name || !ev.execute) {
                            logger.warn(`⚠️ Evento inválido ignorado: ${fullPath}`);
                            continue;
                        }
                        if (ev.once) {
                            client.once(ev.name, (...args) => ev.execute(...args, client));
                        } else {
                            client.on(ev.name, (...args) => ev.execute(...args, client));
                        }
                        count++;
                    }
                } catch (err) {
                    logger.error(`❌ Erro ao carregar evento ${fullPath}: ${err.message}`);
                }
            }
        }
    };

    loadDir(eventsPath);
    logger.success(`✅ ${count} eventos carregados.`);
}

module.exports = { loadEvents };
