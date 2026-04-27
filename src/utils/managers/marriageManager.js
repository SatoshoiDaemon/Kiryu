// src/utils/managers/marriageManager.js
const Marriage = require('@models/Marriage');

/**
 * Adiciona pontos de afinidade a um casamento se os usuários forem casados entre si.
 * @param {string} user1Id O ID do primeiro usuário
 * @param {string} user2Id O ID do segundo usuário
 * @param {string} guildId O ID do servidor
 * @param {number} amount Quantia de afinidade a ganhar 
 * @returns {Promise<boolean>} true se adicionou, false se não eram casados
 */
async function addAffinityIfMarried(user1Id, user2Id, guildId, amount = 2) {
    if (user1Id === user2Id) return false;

    // Procura o casamento exato entre os dois
    const marriage = await Marriage.findOne({
        guildId,
        $or: [
            { user1Id: user1Id, user2Id: user2Id },
            { user1Id: user2Id, user2Id: user1Id }
        ]
    });

    if (!marriage) return false;

    // Soma a afinidade até o máximo de 100
    marriage.affinity = Math.min(100, (marriage.affinity || 0) + amount);
    await marriage.save();
    return true;
}

module.exports = {
    addAffinityIfMarried
};
