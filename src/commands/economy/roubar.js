// src/commands/economy/roubar.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economyManager = require('@utils/managers/economyManager');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');

const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roubar')
        .setDescription('💰 Tente roubar moedas da carteira de outro usuário.')
        .addUserOption(option => 
            option.setName('alvo')
                .setDescription('O usuário que você deseja roubar')
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const user = interaction.user;
        const target = interaction.options.getUser('alvo');

        if (user.id === target.id) {
            return interaction.reply({ content: '❌ Você não pode roubar a si mesmo.', flags: 64 });
        }
        if (target.bot) {
            return interaction.reply({ content: '❌ Você não pode roubar de bots.', flags: 64 });
        }

        const config = await economyManager.getConfig(guildId);
        if (!config.enabled || !config.robEnabled) {
            return interaction.reply({ content: '❌ O sistema de roubo está desativado neste servidor.', flags: 64 });
        }

        // Cooldown de 10 minutos
        const cooldownKey = `${guildId}-${user.id}-rob`;
        if (cooldowns.has(cooldownKey)) {
            const exp = cooldowns.get(cooldownKey);
            if (Date.now() < exp) {
                const remaining = Math.ceil((exp - Date.now()) / 1000 / 60);
                return interaction.reply({ content: `⏳ A polícia está de olho! Aguarde **${remaining} minutos** para tentar roubar novamente.`, flags: 64 });
            }
        }

        const targetData = await economyManager.getUser(target.id, guildId);
        const userData = await economyManager.getUser(user.id, guildId);

        if (targetData.balance < 50) {
            return interaction.reply({ content: '❌ Este usuário não tem moedas suficientes na carteira para valer o risco.', flags: 64 });
        }

        // 40% de chance de sucesso
        const success = Math.random() < 0.40;
        
        // Seta cooldown
        cooldowns.set(cooldownKey, Date.now() + 10 * 60 * 1000);

        if (success) {
            // Rouba entre 10% e 30% da carteira do alvo
            const percentage = Math.random() * (0.30 - 0.10) + 0.10;
            const stolenAmount = Math.floor(targetData.balance * percentage);

            await economyManager.addBalance(target.id, guildId, -stolenAmount);
            await economyManager.addBalance(user.id, guildId, stolenAmount);

            const embed = new EmbedBuilder()
                .setColor(PALETTE.success)
                .setTitle('🔫 Roubo Bem-Sucedido!')
                .setDescription(`Você roubou **${stolenAmount} ${config.currencySymbol}** da carteira de ${target}!`)
                .setFooter(olympusFooter())
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        } else {
            // Falhou: paga multa
            let fine = Math.floor(userData.balance * 0.15); // 15% de multa
            if (fine < 10) fine = 10;
            if (fine > userData.balance) fine = userData.balance;

            await economyManager.addBalance(user.id, guildId, -fine);
            
            const embed = new EmbedBuilder()
                .setColor(PALETTE.error)
                .setTitle('🚨 Você foi pego!')
                .setDescription(`Sua tentativa de roubar ${target} falhou, você foi pego pela polícia e pagou uma multa de **${fine} ${config.currencySymbol}**.`)
                .setFooter(olympusFooter())
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        }
    }
};
