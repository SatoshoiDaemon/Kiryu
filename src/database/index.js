// src/database/index.js
// ============================================================
//   Tengoku Community Bot — Módulo de Banco de Dados
//   Utiliza Mongoose (MongoDB) para alta escalabilidade
// ============================================================

const mongoose = require('mongoose');
const logger = require('@utils/logger');

let isConnected = false;

/**
 * Inicializa a conexão com o banco de dados MongoDB.
 */
async function initializeDatabase() {
    if (isConnected) return mongoose.connection;
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI não configurado no arquivo .env.');
    }

    mongoose.set('strictQuery', false);

    try {
        await mongoose.connect(uri);

        mongoose.connection.on('error', err => {
            logger.error(`[Mongoose] Erro na conexão: ${err.message}`);
        });

        isConnected = true;
        logger.info('✅ Banco de dados conectado com sucesso (Mongoose).');
        return mongoose.connection;
    } catch (error) {
        logger.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
        throw error;
    }
}

/**
 * Retorna true se estiver conectado, falso se não estiver.
 */
function isDBConnected() {
    return isConnected;
}

module.exports = { initializeDatabase, isDBConnected };
