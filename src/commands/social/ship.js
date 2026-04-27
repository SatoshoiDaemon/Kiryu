// src/commands/social/ship.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Marriage = require('@models/Marriage');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ship')
        .setDescription('💖 Mede a afinidade entre duas pessoas.')
        .addUserOption(o => o.setName('usuario1').setDescription('Primeira pessoa').setRequired(true))
        .addUserOption(o => o.setName('usuario2').setDescription('Segunda pessoa (Padrão: você)').setRequired(false)),

    async execute(interaction) {
        const user1 = interaction.options.getUser('usuario1');
        const user2 = interaction.options.getUser('usuario2') || interaction.user;
        const guildId = interaction.guildId;

        if (user1.id === user2.id || user1.bot || user2.bot) {
            return interaction.reply({ content: '❌ Crie ships válidos entre duas pessoas reais diferentes!', flags: 64 });
        }

        let affinityPorcent = 0;
        let isTrueMarriage = false;

        // Verifica se estão casados de verdade
        const marriage = await Marriage.findOne({
            guildId,
            $or: [
                { user1Id: user1.id, user2Id: user2.id },
                { user1Id: user2.id, user2Id: user1.id }
            ]
        });

        if (marriage) {
            isTrueMarriage = true;
            affinityPorcent = marriage.affinity ?? 100;
        } else {
            // Conta de padronização usando BigInt para somar IDs longos 
            // e gerar um número repetível para este par em específico
            const sum = BigInt(user1.id) + BigInt(user2.id);
            affinityPorcent = Number(sum % 101n); // De 0 a 100
        }

        // Monta a barra
        const filled = Math.round(affinityPorcent / 10);
        const empty = 10 - filled;
        const bar = `[${'💖'.repeat(filled)}${'🖤'.repeat(empty)}]`;

        let frase = '';
        if (affinityPorcent >= 90) frase = 'Casal Perfeito! Devem se casar imediatamente. 💍';
        else if (affinityPorcent >= 70) frase = 'Existe uma chaminha aqui... 🔥';
        else if (affinityPorcent >= 40) frase = 'Podem ser bons amigos. 🤝';
        else if (affinityPorcent >= 20) frase = 'Talvez seja melhor não forçar. 😬';
        else frase = 'Inimigos mortais! ☠️';

        if (isTrueMarriage) {
            frase = affinityPorcent < 50 ? '⚠️ A afinidade do casamento está caindo! Interajam mais.' : '💍 Estão casados e felizes juntos!';
        }

        const embed = new EmbedBuilder()
            .setColor(PALETTE.accent)
            .setTitle(`💖 Ship: ${user1.username} & ${user2.username}`)
            .setDescription(`A afinidade entre os dois é de **${affinityPorcent}%**\n\n${bar}\n\n*${frase}*`)
            .setFooter(tengokuFooter())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
