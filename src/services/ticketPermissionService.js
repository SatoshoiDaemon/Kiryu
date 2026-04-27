const { PermissionFlagsBits } = require('discord.js');

function buildOpenTicketOverwrites(guildId, ownerId, staffRoleIds, botId) {
    const overwrites = [
        {
            id: guildId,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            id: ownerId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
            ],
        },
        ...staffRoleIds.map(roleId => ({
            id: roleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
            ],
        })),
        {
            id: botId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
            ],
        },
    ];

    return overwrites;
}

function buildClosedTicketOverwrites(guildId, ownerId, staffRoleIds, botId) {
    const overwrites = buildOpenTicketOverwrites(guildId, ownerId, staffRoleIds, botId);
    return overwrites.map(overwrite => {
        if (overwrite.id === ownerId) {
            return {
                ...overwrite,
                deny: [...new Set([...(overwrite.deny || []), PermissionFlagsBits.SendMessages])],
                allow: overwrite.allow.filter(perm => perm !== PermissionFlagsBits.SendMessages),
            };
        }
        return overwrite;
    });
}

module.exports = {
    buildOpenTicketOverwrites,
    buildClosedTicketOverwrites,
};
