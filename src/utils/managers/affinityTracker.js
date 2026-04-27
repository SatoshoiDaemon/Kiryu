// src/utils/managers/affinityTracker.js
const Marriage = require('@models/Marriage');
const logger = require('@utils/logger');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

async function runAffinityDegradation(client) {
    logger.info('[AffinityTracker] Iniciando rastreamento diário de afinidade matrimonial...');

    const marriages = await Marriage.find({});
    const now = new Date();

    for (const m of marriages) {
        // Se a última degradação ocorreu há mais de 1 dia...
        if (!m.lastDegradation || (now - m.lastDegradation.getTime()) >= DAY_IN_MS) {
            const oldAffinity = m.affinity || 100;
            const newAffinity = Math.max(0, oldAffinity - 5);

            m.affinity = newAffinity;
            m.lastDegradation = now;
            await m.save().catch(() => null);

            // Se cruzou o limite para baixo de 20%, envia aviso
            if (oldAffinity >= 20 && newAffinity < 20) {
                try {
                    const u1 = await client.users.fetch(m.user1Id);
                    if (u1) await u1.send(`⚠️ **Aviso do Olympus:** Seu casamento com <@${m.user2Id}> está esfriando! A afinidade caiu para **${newAffinity}%**. Interajam mais usando os comandos sociais!`).catch(() => null);
                } catch { /* ignora dm fechada */ }
                
                try {
                    const u2 = await client.users.fetch(m.user2Id);
                    if (u2) await u2.send(`⚠️ **Aviso do Olympus:** Seu casamento com <@${m.user1Id}> está esfriando! A afinidade caiu para **${newAffinity}%**. Interajam mais usando os comandos sociais!`).catch(() => null);
                } catch { /* ignora dm fechada */ }
            }
        }
    }
}

// Inicia um loop global com verificação a cada 1 hora
function startAffinityTracker(client) {
    runAffinityDegradation(client);
    setInterval(() => runAffinityDegradation(client), 60 * 60 * 1000);
}

module.exports = { startAffinityTracker };
