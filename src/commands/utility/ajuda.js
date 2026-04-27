// src/commands/utility/ajuda.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');
const { PALETTE, olympusFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');
const { version } = require('../../../package.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajuda')
        .setDescription('📖 Exibe todos os comandos disponíveis.'),

    async execute(interaction) {
        const branding = await brandingManager.get(interaction.guildId);
        const color = branding.accent || PALETTE.accent;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('📖 Central de Ajuda')
            .setDescription(
                `Bem-vindo(a) à central de ajuda!\n\n` +
                `Use o menu abaixo para navegar pelas categorias de comandos.\n` +
                `Todos os comandos são executados via **/**.\n\n` +
                `> Desenvolvido por **Olympus Studio** — v${version}`
            )
            .addFields(
                { name: '⚙️ Administração', value: 'Configuração, moderação e gerenciamento do servidor', inline: true },
                { name: '💰 Economia',       value: 'Sistema de moedas, daily, trabalho e banco', inline: true },
                { name: '⭐ Utilidades',     value: 'XP, ranking, informações e sugestões', inline: true },
                { name: '🎮 Diversão',       value: 'Jogos como blackjack e roleta', inline: true },
                { name: '💙 Social',         value: 'Interações sociais e casamentos', inline: true },
            )
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter(olympusFooter(`v${version}`))
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help:category')
            .setPlaceholder('Selecione uma categoria...')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('⚙️ Administração').setValue('admin').setDescription('Configuração e moderação').setEmoji('⚙️'),
                new StringSelectMenuOptionBuilder().setLabel('💰 Economia').setValue('economy').setDescription('Moedas, daily e trabalho').setEmoji('💰'),
                new StringSelectMenuOptionBuilder().setLabel('⭐ Utilidades').setValue('utility').setDescription('XP, ranking e informações').setEmoji('⭐'),
                new StringSelectMenuOptionBuilder().setLabel('🎮 Diversão').setValue('fun').setDescription('Jogos e entretenimento').setEmoji('🎮'),
                new StringSelectMenuOptionBuilder().setLabel('💙 Social').setValue('social').setDescription('Interações sociais').setEmoji('💙'),
            );

        const row = new ActionRowBuilder().addComponents(menu);

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};

// Dados das categorias para o handler de select
const CATEGORIES = {
    admin: {
        title: '⚙️ Administração',
        commands: [
            { name: '/ban', desc: 'Bane um usuário do servidor.' },
            { name: '/case', desc: 'Visualiza detalhes específicos de um caso de moderação (Case ID).' },
            { name: '/config', desc: 'Painel de configuração do bot para este servidor.' },
            { name: '/embed', desc: 'Abre o construtor visual de embeds e webhooks.' },
            { name: '/emoji', desc: 'Gerencia e visualiza emojis do servidor.' },
            { name: '/gerenciar', desc: 'Gerencia XP, Level e Dinheiro de um membro (Admin).' },
            { name: '/hackban', desc: 'Bane um usuário pelo ID, sem que ele esteja no servidor.' },
            { name: '/kick', desc: 'Expulsa um usuário do servidor.' },
            { name: '/limpar', desc: 'Remove mensagens do canal.' },
            { name: '/logs', desc: 'Visualiza o histórico de moderação do servidor.' },
            { name: '/mute', desc: 'Silencia (timeout) um usuário no servidor.' },
            { name: '/notes', desc: 'Gerencie notas de moderação de um membro.' },
            { name: '/role', desc: 'Gerencia e visualiza informações de cargos do servidor.' },
            { name: '/setup', desc: 'Configurações avançadas do servidor.' },
            { name: '/transcript', desc: 'Gera um transcript de um canal como arquivo HTML.' },
            { name: '/unban', desc: 'Desbane um usuário do servidor.' },
            { name: '/unmute', desc: 'Remove o silenciamento (timeout) de um usuário.' },
            { name: '/verificar', desc: 'Verifica um membro manualmente ignorando o captcha.' },
            { name: '/warn', desc: 'Aplica uma advertência a um usuário.' }
        ],
    },
    economy: {
        title: '💰 Economia',
        commands: [
            { name: '/banco', desc: 'Deposite ou saque moedas do banco.' },
            { name: '/carteira', desc: 'Veja o saldo de sua carteira.' },
            { name: '/coletar', desc: 'Colete seus ganhos no Mines antes de explodir!' },
            { name: '/daily', desc: 'Colete sua recompensa diária.' },
            { name: '/inventario', desc: 'Veja seu inventário de itens.' },
            { name: '/loja', desc: 'Acesse a loja do servidor.' },
            { name: '/moedas', desc: 'Gerenciamento de moedas (Admin).' },
            { name: '/pay', desc: 'Transfira moedas da sua carteira para outro usuário.' },
            { name: '/roubar', desc: 'Tente roubar moedas da carteira de outro usuário.' },
            { name: '/trabalhar', desc: 'Trabalhe para ganhar moedas.' }
        ],
    },
    fun: {
        title: '🎮 Diversão',
        commands: [
            { name: '/blackjack', desc: 'Jogue blackjack contra o dealer.' },
            { name: '/coinflip', desc: 'Jogue cara ou coroa apostando moedas.' },
            { name: '/mines', desc: 'Jogue Campo Minado! Revele casas e colete antes de explodir.' },
            { name: '/roleta', desc: 'Aposte na roleta.' }
        ],
    },
    social: {
        title: '💙 Social',
        commands: [
            { name: '/abracar', desc: 'Dê um abraço em alguém.' },
            { name: '/beijar', desc: 'Dê um beijo em alguém.' },
            { name: '/bonk', desc: 'Dê um bonk em alguém.' },
            { name: '/casar', desc: 'Peça alguém em casamento.' },
            { name: '/corar', desc: 'Ficar corado.' },
            { name: '/cry', desc: 'Chore no chat.' },
            { name: '/dancar', desc: 'Dançar com um usuário.' },
            { name: '/divorciar', desc: 'Divorcie-se do seu parceiro.' },
            { name: '/highfive', desc: 'Dar um toque aqui com alguém.' },
            { name: '/morder', desc: 'Morder um usuário.' },
            { name: '/pat', desc: 'Faça carinho em alguém.' },
            { name: '/perfil', desc: 'Veja ou edite seu perfil social.' },
            { name: '/ship', desc: 'Mede a afinidade entre duas pessoas.' },
            { name: '/tapa', desc: 'Dê um tapa em alguém.' }
        ],
    },
    utility: {
        title: '⭐ Utilidades',
        commands: [
            { name: '/afk', desc: 'Defina um status de ausente para ser exibido a quem te mencionar.' },
            { name: '/ajuda', desc: 'Exibe todos os comandos disponíveis.' },
            { name: '/avatar', desc: 'Mostra a foto de perfil de um usuário.' },
            { name: '/banner', desc: 'Mostra o banner do perfil de um usuário.' },
            { name: '/botinfo', desc: 'Exibe informações técnicas e estatísticas do bot.' },
            { name: '/instafeed', desc: 'Compartilhe uma foto no feed do servidor.' },
            { name: '/lembrete', desc: 'Crie um lembrete para ser notificado depois.' },
            { name: '/parceria', desc: 'Envie uma candidatura de parceria para o servidor.' },
            { name: '/ping', desc: 'Verifica a latência do bot.' },
            { name: '/ranking', desc: 'Veja os rankings do servidor.' },
            { name: '/serverinfo', desc: 'Exibe informações sobre o servidor atual.' },
            { name: '/sugestao', desc: 'Envie uma sugestão para o servidor.' },
            { name: '/uptime', desc: 'Mostra há quanto tempo o bot está online.' },
            { name: '/userinfo', desc: 'Exibe informações sobre um usuário.' },
            { name: '/xp', desc: 'Veja seu progresso de nível e XP atual.' }
        ],
    }
};

module.exports.CATEGORIES = CATEGORIES;
