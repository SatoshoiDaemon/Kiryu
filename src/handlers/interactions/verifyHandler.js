// src/handlers/interactions/verifyHandler.js
// ============================================================
//   Tengoku Community Bot — Handler de Verificação Captcha
// ============================================================

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    AttachmentBuilder
} = require('discord.js');
const { CaptchaGenerator } = require('captcha-canvas');
const Guild = require('@models/Guild');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const logger = require('@utils/logger');

// Cache em memória dos códigos de captcha: userId -> { code: string, expiresAt: number }
const captchaSessions = new Map();

/**
 * Inicia o processo de verificação ao clicar no botão "Verificar-se"
 */
async function handleVerifyStart(interaction) {
    const userId = interaction.user.id;
    
    // Gera o captcha
    const captcha = new CaptchaGenerator()
        .setDimension(150, 450)
        .setCaptcha({ size: 60, color: 'deeppink' })
        .setDecoy({ opacity: 0.5 })
        .setTrace({ color: 'deeppink' });
    
    const buffer = captcha.generateSync();
    const code = captcha.text;
    
    // Salva a sessão (expira em 2 minutos)
    captchaSessions.set(userId, {
        code: code,
        expiresAt: Date.now() + (2 * 60 * 1000)
    });

    const attachment = new AttachmentBuilder(buffer, { name: 'captcha.png' });

    const embed = new EmbedBuilder()
        .setColor(PALETTE.primary)
        .setTitle('🛡️ Verificação Humana')
        .setDescription('Identificamos que você quer entrar no servidor! Para prosseguir, digite o código que aparece na imagem abaixo clicando no botão **Responder**.')
        .setImage('attachment://captcha.png')
        .setFooter(tengokuFooter('O código expira em 2 minutos'))
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('verify:answer')
            .setLabel('Responder')
            .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({ 
        embeds: [embed], 
        files: [attachment], 
        components: [row], 
        flags: 64 
    });
}

/**
 * Abre o modal para o usuário digitar o captcha
 */
async function handleVerifyAnswer(interaction) {
    const userId = interaction.user.id;
    const session = captchaSessions.get(userId);

    if (!session || Date.now() > session.expiresAt) {
        captchaSessions.delete(userId);
        return interaction.reply({ content: '❌ Seu tempo expirou ou o captcha não foi encontrado. Clique em "Verificar-se" novamente.', flags: 64 });
    }

    const modal = new ModalBuilder()
        .setCustomId('modal:verify:submit')
        .setTitle('🛡️ Resolver Captcha');

    const input = new TextInputBuilder()
        .setCustomId('captcha_input')
        .setLabel('Digite os caracteres da imagem')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(captchaSessions.get(userId).code.length)
        .setMaxLength(captchaSessions.get(userId).code.length);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
}

/**
 * Processa o resultado do captcha
 */
async function handleVerifySubmit(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const userInput = interaction.fields.getTextInputValue('captcha_input');
    const session = captchaSessions.get(userId);

    if (!session) {
        return interaction.reply({ content: '❌ Sessão não encontrada.', flags: 64 });
    }

    const isCorrect = userInput.toLowerCase() === session.code.toLowerCase();
    captchaSessions.delete(userId);

    const guildDoc = await Guild.findOne({ guildId });
    const config = guildDoc?.verificationConfig;

    if (!config) return interaction.reply({ content: '❌ Erro interno: configuração não encontrada.', flags: 64 });

    if (isCorrect) {
        try {
            const member = await interaction.guild.members.fetch(userId);
            const role = interaction.guild.roles.cache.get(config.roleId);
            
            if (role) await member.roles.add(role);

            return interaction.reply({ 
                content: '✅ **Verificação concluída!** Você já pode acessar os canais do servidor.', 
                flags: 64 
            });
        } catch (err) {
            logger.error(`Erro ao verificar usuário ${userId}: ${err.message}`);
            return interaction.reply({ content: '❌ Erro ao atribuir o cargo. Contate um administrador.', flags: 64 });
        }
    } else {
        // Falhou no captcha
        const failAction = config.failAction || 'none';
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Código incorreto!', flags: 64 });

        if (failAction === 'kick') {
            await member.kick('Falha na verificação por captcha.').catch(() => null);
            return interaction.reply({ content: '❌ Código incorreto! Você foi **kickado**. Tente novamente ao entrar.', flags: 64 });
        } else if (failAction === 'ban') {
            await member.ban({ reason: 'Falha na verificação por captcha.' }).catch(() => null);
            return interaction.reply({ content: '❌ Código incorreto! Você foi **banido** por falha de segurança.', flags: 64 });
        } else {
            return interaction.reply({ content: '❌ Código incorreto! Tente o processo novamente desde o início.', flags: 64 });
        }
    }
}

module.exports = {
    handleVerifyStart,
    handleVerifyAnswer,
    handleVerifySubmit
};
