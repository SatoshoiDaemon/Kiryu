// src/utils/managers/permissionsManager.js
// ============================================================
//   Olympus Community Bot — Gerenciador de Permissões Granular
//   Todas as permissões são armazenadas no banco de dados
// ============================================================

const CommandPermission = require('@models/CommandPermission');
const { PermissionFlagsBits } = require('discord.js');

class PermissionsManager {
    /**
     * Verifica se um membro tem permissão para executar um comando.
     * Hierarquia: Administrador > Permissão Discord nativa > Permissão por cargo/usuário no BD
     *
     * @param {GuildMember} member
     * @param {string} command Nome do comando
     * @param {PermissionFlagsBits} [discordPerm] Permissão nativa do Discord (opcional)
     * @returns {Promise<boolean>}
     */
    async hasPermission(member, command, discordPerm = null) {
        // Administradores sempre têm acesso
        if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

        // Verifica permissão nativa do Discord, se fornecida
        if (discordPerm && member.permissions.has(discordPerm)) return true;

        // Verifica permissões configuradas no banco de dados
        const guildId = member.guild.id;

        // Verifica por usuário
        const userPerm = await CommandPermission.findOne({
            guildId,
            command,
            type: 'user',
            targetId: member.id
        });
        if (userPerm) return true;

        // Verifica por cargo
        const roleIds = [...member.roles.cache.keys()];
        if (roleIds.length > 0) {
            const rolePerm = await CommandPermission.findOne({
                guildId,
                command,
                type: 'role',
                targetId: { $in: roleIds }
            });
            if (rolePerm) return true;
        }

        return false;
    }

    /**
     * Adiciona uma permissão de cargo ou usuário para um comando.
     * @param {string} guildId
     * @param {string} command
     * @param {'role'|'user'} type
     * @param {string} targetId
     */
    async addPermission(guildId, command, type, targetId) {
        await CommandPermission.findOneAndUpdate(
            { guildId, command, type, targetId },
            { $set: { guildId, command, type, targetId } },
            { upsert: true }
        );
    }

    /**
     * Remove uma permissão de cargo ou usuário para um comando.
     * @param {string} guildId
     * @param {string} command
     * @param {'role'|'user'} type
     * @param {string} targetId
     */
    async removePermission(guildId, command, type, targetId) {
        await CommandPermission.deleteOne({ guildId, command, type, targetId });
    }

    /**
     * Lista todas as permissões configuradas para um comando em um servidor.
     * @param {string} guildId
     * @param {string} command
     * @returns {Promise<Array<{type: string, target_id: string}>>}
     */
    async listPermissions(guildId, command) {
        const perms = await CommandPermission.find({ guildId, command }).sort({ type: 1, targetId: 1 });
        return perms.map(p => ({
            type: p.type,
            targetId: p.targetId
        }));
    }

    /**
     * Remove todas as permissões de um comando em um servidor.
     * @param {string} guildId
     * @param {string} command
     */
    async clearPermissions(guildId, command) {
        await CommandPermission.deleteMany({ guildId, command });
    }

    /**
     * Lista todos os comandos com permissões configuradas no servidor.
     * @param {string} guildId
     * @returns {Promise<string[]>}
     */
    async listConfiguredCommands(guildId) {
        const commands = await CommandPermission.distinct('command', { guildId });
        return commands.sort();
    }
}

module.exports = new PermissionsManager();
