'use strict';

const { createClient } = require('redis');

// Lazy import of env to avoid circular deps at startup
// (redisClient.js is required before dotenv finishes in some test runners)
function getEnv() {
  return require('../src/config/env').env;
}

let _client = null;

/**
 * Returns the singleton Redis client, connecting on first call.
 *
 * Reads configuration from the central env object (src/config/env.js)
 * rather than process.env directly, ensuring a single authoritative config source.
 *
 * Connection strategy:
 *   1. Prefers REDIS_HOST + REDIS_PORT + REDIS_PASSWORD (explicit host/port)
 *   2. Falls back to REDIS_URL (connection string) for PaaS deployments
 *
 * @returns {Promise<import('redis').RedisClientType>}
 */
async function getRedis() {
  if (_client && _client.isOpen) {
    return _client;
  }

  const env = getEnv();

  // Build connection config — prefer explicit host/port over URL
  const socketConfig = env.REDIS_HOST
    ? {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        tls: env.REDIS_TLS,
        reconnectStrategy: _reconnectStrategy,
      }
    : undefined;

  _client = createClient({
    ...(socketConfig ? { socket: socketConfig } : { url: env.REDIS_URL }),
    ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  });

  _client.on('error', (err) => {
    // Use console.error here — logger may not be ready at connection time
    console.error('[Redis] Connection error:', err.message);
  });
  _client.on('connect', () => console.info('[Redis] Connecting...'));
  _client.on('ready', () => console.info('[Redis] Ready'));
  _client.on('reconnecting', () => console.warn('[Redis] Reconnecting...'));
  _client.on('end', () => console.warn('[Redis] Connection closed'));

  await _client.connect();
  return _client;
}

/**
 * Gracefully closes the Redis connection.
 * Call during application shutdown (SIGTERM/SIGINT).
 */
async function closeRedis() {
  if (_client) {
    await _client.quit();
    _client = null;
    console.info('[Redis] Connection closed gracefully');
  }
}

/**
 * Reconnect back-off: exponential up to 3s, give up after 10 retries.
 * @private
 */
function _reconnectStrategy(retries) {
  if (retries > 10) {
    console.error('[Redis] Too many reconnect attempts — giving up');
    return new Error('Redis reconnect limit reached');
  }
  return Math.min(retries * 200, 3000);
}

module.exports = { getRedis, closeRedis };
