// src/events/client/ready.js
// ============================================================
//   Olympus Community Bot — Evento: Bot Pronto
// ============================================================

const { ActivityType } = require('discord.js');
const logger = require('@utils/logger');

const ACTIVITIES = [
    { name: '/config | Olympus Studio', type: ActivityType.Watching },
    { name: 'sua comunidade crescer', type: ActivityType.Watching },
    { name: '/ajuda | Olympus Studio', type: ActivityType.Playing },
];

let activityIndex = 0;
const { loadCommands, registerCommands } = require('@handlers/commandHandler');
const { startAffinityTracker } = require('@utils/managers/affinityTracker');
const { startReminderTracker } = require('@utils/managers/reminderTracker');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        logger.info(`✅ Bot online como ${client.user.tag}`);
        logger.info(`📊 Conectado a ${client.guilds.cache.size} servidor(es)`);
        logger.info(`👥 Servindo ${client.users.cache.size} usuário(s)`);

        // Registra os comandos após o bot estar pronto
        const commandData = loadCommands(client);
        await registerCommands(client, commandData);

        // Define atividade inicial
        updateActivity(client);

        // Rotaciona atividades a cada 30 segundos
        setInterval(() => updateActivity(client), 30 * 1000);

        // Inicia trackers auxiliares
        startAffinityTracker(client);
        startReminderTracker(client);

        const rulesManager = require('@utils/managers/rulesManager');
        rulesManager.init(client);

        const autoResponseManager = require('@utils/managers/autoResponseManager');
        autoResponseManager.init();
    },
};

function updateActivity(client) {
    const activity = ACTIVITIES[activityIndex % ACTIVITIES.length];
    client.user.setActivity(activity.name, { type: activity.type });
    activityIndex++;
}
