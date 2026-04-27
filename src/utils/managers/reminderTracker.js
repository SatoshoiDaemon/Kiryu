// src/utils/managers/reminderTracker.js
const Reminder = require('@models/Reminder');
const { EmbedBuilder } = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const logger = require('@utils/logger');

async function checkReminders(client) {
    const defaultDate = new Date();
    const activeReminders = await Reminder.find({ expiresAt: { $lte: defaultDate } });

    for (const rem of activeReminders) {
        try {
            const user = await client.users.fetch(rem.userId);
            const embed = new EmbedBuilder()
                .setColor(PALETTE.accent)
                .setTitle('⏰ Olympus Lembrete!')
                .setDescription(`Você me pediu para lhe lembrar sobre:\n\n**"${rem.reason}"**`)
                .setFooter(olympusFooter())
                .setTimestamp();

            // Tenta enviar via DM primeiro
            let dmEnviado = false;
            try {
                if (user) {
                    await user.send({ embeds: [embed] });
                    dmEnviado = true;
                }
            } catch {
                dmEnviado = false;
            }

            // Se falhou DM, caça o canal original e tenta mandar lá pingando
            if (!dmEnviado) {
                const channel = await client.channels.fetch(rem.channelId).catch(() => null);
                if (channel && channel.isTextBased()) {
                    await channel.send({ content: `<@${rem.userId}>`, embeds: [embed] }).catch(() => null);
                }
            }
        } catch (e) {
            logger.error(`❌ Erro ao disparar lembrete para ${rem.userId}: ${e.message}`);
        }

        // Deleta o documento
        await Reminder.findByIdAndDelete(rem._id).catch(() => null);
    }
}

function startReminderTracker(client) {
    // Escaneia a cada 15 segundos
    setInterval(() => checkReminders(client), 15000);
}

module.exports = { startReminderTracker };
