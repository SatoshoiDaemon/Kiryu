// src/commands/fun/escolher.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('escolher')
        .setDescription('🎲 Deixa o destino decidir! Escolhe aleatoriamente uma entre várias opções.')
        .addStringOption(option =>
            option.setName('opcoes')
                .setDescription('As opções para o bot escolher, separadas por VÍRGULA (Ex: Pizza, Hambúrguer, Sushi)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const input = interaction.options.getString('opcoes');

        // Divide o input pelas vírgulas e remove espaços vazios
        const choices = input.split(',')
            .map(opt => opt.trim())
            .filter(opt => opt.length > 0);

        if (choices.length < 2) {
            return interaction.reply({
                content: '❌ Você precisa fornecer pelo menos 2 opções separadas por vírgula para eu poder escolher!',
                flags: 64
            });
        }

        // Escolha segura e aleatória
        const randomIndex = Math.floor(Math.random() * choices.length);
        const winner = choices[randomIndex];

        const embed = new EmbedBuilder()
            .setColor(PALETTE.fun || PALETTE.primary)
            .setTitle('🎲 O Destino Escolheu!')
            .setDescription(`Eu analisei **${choices.length}** opções e a minha escolha é:\n\n🎉 **>> ${winner} <<** 🎉`)
            .addFields({ name: 'Opções oferecidas:', value: `\`${choices.join('` | `')}\`` })
            .setFooter(tengokuFooter(`Sorteio solicitado por ${interaction.user.username}`))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
