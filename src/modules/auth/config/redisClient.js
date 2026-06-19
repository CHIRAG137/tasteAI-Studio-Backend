'use strict';

const { createClient } = require('redis');
const logger = require('../../shared/logging');

/**
 * Object-oriented wrapper for the Redis client SDK scoped exclusively to the Auth module.
 * Encapsulates connection lifecycle management, reconnect strategy, and error handling.
 */
class RedisClient {
  /**
   * @param {object} options
   * @param {string} [options.host] - Redis host (optional, preferred over URL)
   * @param {number} [options.port] - Redis port (optional)
   * @param {string} [options.password] - Redis password (optional)
   * @param {boolean} [options.tls] - Force TLS connection (optional)
   * @param {string} [options.url] - Fallback Redis connection URL
   */
  constructor({ host, port, password, tls, url } = {}) {
    this._host = host;
    this._port = port;
    this._password = password;
    this._tls = tls;
    this._url = url;
    this._client = null;
  }

  /**
   * Returns the connected Redis client, connecting on first call.
   *
   * @returns {Promise<import('redis').RedisClientType>}
   */
  async getClient() {
    if (this._client && this._client.isOpen) {
      return this._client;
    }

    const socketConfig = this._host
      ? {
          host: this._host,
          port: this._port,
          tls: this._tls,
          reconnectStrategy: this._reconnectStrategy.bind(this),
        }
      : undefined;

    this._client = createClient({
      ...(socketConfig ? { socket: socketConfig } : { url: this._url }),
      ...(this._password ? { password: this._password } : {}),
    });

    this._client.on('error', (err) => {
      logger.error('[Auth Redis] Connection error:', { error: err.message });
    });
    this._client.on('connect', () => logger.info('[Auth Redis] Connecting...'));
    this._client.on('ready', () => logger.info('[Auth Redis] Ready'));
    this._client.on('reconnecting', () => logger.warn('[Auth Redis] Reconnecting...'));
    this._client.on('end', () => logger.warn('[Auth Redis] Connection closed'));

    await this._client.connect();
    return this._client;
  }

  /**
   * Gracefully closes the Redis connection.
   */
  async close() {
    if (this._client) {
      await this._client.quit();
      this._client = null;
      logger.info('[Auth Redis] Connection closed gracefully');
    }
  }

  /**
   * Reconnect back-off: exponential up to 3s, give up after 10 retries.
   *
   * @private
   * @param {number} retries
   * @returns {number|Error}
   */
  _reconnectStrategy(retries) {
    if (retries > 10) {
      logger.error('[Auth Redis] Too many reconnect attempts — giving up');
      return new Error('Redis reconnect limit reached');
    }
    return Math.min(retries * 200, 3000);
  }
}

module.exports = RedisClient;
