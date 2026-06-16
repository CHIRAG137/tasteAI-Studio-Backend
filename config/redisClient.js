'use strict';

const { createClient } = require('redis');
const logger = require('../utils/logger');

let _client = null;

async function getRedis() {
  if (_client && _client.isOpen) {
    return _client;
  }

  _client = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10),
      tls: false, // ← plain connection for Redis Cloud free tier
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis: too many reconnect attempts, giving up');
          return new Error('Redis reconnect limit reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
    password: process.env.REDIS_PASSWORD,
  });

  _client.on('error', (err) => console.error('Redis Error:', err.message));
  _client.on('connect', () => logger.info('Redis connected'));
  _client.on('reconnecting', () => logger.warn('Redis reconnecting'));
  _client.on('ready', () => logger.info('Redis ready'));

  await _client.connect();
  return _client;
}

async function closeRedis() {
  if (_client) {
    await _client.quit();
    _client = null;
    logger.info('Redis connection closed');
  }
}

module.exports = { getRedis, closeRedis };
