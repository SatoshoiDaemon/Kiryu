// src/commands/utility/afk.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserData = require('@models/UserData');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('💤 Defina um status de ausente para ser exibido a quem te mencionar.')
        .addStringOption(o => o.setName('motivo').setDescription('Por que você está ausente?').setRequired(false)),

    async execute(interaction) {
        const reason = interaction.options.getString('motivo') || 'AFK';

        await UserData.findOneAndUpdate(
            { userId: interaction.user.id, guildId: interaction.guildId },
            { 
                $set: { 
                    'afkData.isAfk': true, 
                    'afkData.reason': reason, 
                    'afkData.since': new Date() 
                } 
            },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setColor(PALETTE.primary)
            .setDescription(`💤 ${interaction.user.toString()} setou seu status como **AFK**: \`${reason}\``)
            .setFooter(olympusFooter('Qualquer mensagem sua removerá o AFK'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
