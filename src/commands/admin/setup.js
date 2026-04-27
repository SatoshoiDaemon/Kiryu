// src/commands/admin/setup.js
// ============================================================
//   Tengoku Community Bot — Configuração de Verificação
// ============================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Guild = require('@models/Guild');
const { PALETTE, tengokuFooter } = require('@utils/helpers/embedHelper');
const brandingManager = require('@utils/managers/brandingManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('🛠️ Configurações avançadas do servidor.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group.setName('verificacao')
                .setDescription('🛡️ Configura o sistema de verificação por captcha.')
                .addSubcommand(sub =>
                    sub.setName('config')
                        .setDescription('⚙️ Define o canal, cargo e ação de falha.')
                        .addChannelOption(o => o.setName('canal').setDescription('Canal onde a mensagem de verificação será enviada').setRequired(true))
                        .addRoleOption(o => o.setName('cargo').setDescription('Cargo dado após a verificação').setRequired(true))
                        .addStringOption(o => o.setName('falha').setDescription('Ação caso o usuário erre o captcha')
                            .addChoices(
                                { name: 'Manter (Nenhuma ação)', value: 'none' },
                                { name: 'Kickar', value: 'kick' },
                                { name: 'Banir', value: 'ban' }
                            ).setRequired(true))
                )
                .addSubcommand(sub =>
                    sub.setName('embed')
                        .setDescription('🎨 Personaliza a embed de verificação.')
                        .addStringOption(o => o.setName('titulo').setDescription('Título da embed'))
                        .addStringOption(o => o.setName('descricao').setDescription('Descrição da embed'))
                        .addStringOption(o => o.setName('imagem').setDescription('URL da imagem da embed'))
                )
                .addSubcommand(sub =>
                    sub.setName('enviar')
                        .setDescription('📤 Envia a mensagem de verificação no canal configurado.')
                )
        ),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (group === 'verificacao') {
            let guildDoc = await Guild.findOne({ guildId });
            if (!guildDoc) guildDoc = await Guild.create({ guildId });

            if (sub === 'config') {
                const channel = interaction.options.getChannel('canal');
                const role = interaction.options.getRole('cargo');
                const failAction = interaction.options.getString('falha');

                guildDoc.verificationConfig.channelId = channel.id;
                guildDoc.verificationConfig.roleId = role.id;
                guildDoc.verificationConfig.failAction = failAction;
                guildDoc.verificationConfig.enabled = true;

                await guildDoc.save();

                return interaction.reply({
                    content: `✅ Sistema de verificação configurado!\n📍 **Canal:** ${channel}\n🛡️ **Cargo:** ${role}\n⚡ **Ação de falha:** \`${failAction}\``,
                    flags: 64
                });
            }

            if (sub === 'embed') {
                const title = interaction.options.getString('titulo');
                const description = interaction.options.getString('descricao');
                const image = interaction.options.getString('imagem');

                if (title) guildDoc.verificationConfig.embed.title = title;
                if (description) guildDoc.verificationConfig.embed.description = description;
                if (image) guildDoc.verificationConfig.embed.image = image;

                await guildDoc.save();

                return interaction.reply({
                    content: '✅ Design da embed de verificação atualizado!',
                    flags: 64
                });
            }

            if (sub === 'enviar') {
                const config = guildDoc.verificationConfig;
                if (!config.enabled || !config.channelId) {
                    return interaction.reply({ content: '❌ O sistema de verificação não está totalmente configurado. Use `/setup verificacao config` primeiro.', flags: 64 });
                }

                const channel = interaction.guild.channels.cache.get(config.channelId);
                if (!channel) return interaction.reply({ content: '❌ Canal de verificação não encontrado.', flags: 64 });

                const branding = await brandingManager.get(guildId);
                const embed = new EmbedBuilder()
                    .setTitle(config.embed.title)
                    .setDescription(config.embed.description)
                    .setColor(config.embed.color || branding.accent || PALETTE.accent)
                    .setFooter(tengokuFooter())
                    .setTimestamp();

                if (config.embed.image) embed.setImage(config.embed.image);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify:start')
                        .setLabel('Verificar-se')
                        .setEmoji('🛡️')
                        .setStyle(ButtonStyle.Success)
                );

                await channel.send({ embeds: [embed], components: [row] });

                return interaction.reply({ content: '✅ Mensagem de verificação enviada!', flags: 64 });
            }
        }
    },
};
