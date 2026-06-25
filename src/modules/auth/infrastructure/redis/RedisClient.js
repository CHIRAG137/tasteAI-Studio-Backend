'use strict';

const { createClient } = require('redis');
const logger = require('../../../shared/logging');

class RedisClient {
  constructor({ host, port, password, tls, url } = {}) {
    this._host = host;
    this._port = port;
    this._password = password;
    this._tls = tls;
    this._url = url;
    this._client = null;
  }

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

  async close() {
    if (this._client) {
      await this._client.quit();
      this._client = null;
      logger.info('[Auth Redis] Connection closed gracefully');
    }
  }

  _reconnectStrategy(retries) {
    if (retries > 10) {
      logger.error('[Auth Redis] Too many reconnect attempts — giving up');
      return new Error('Redis reconnect limit reached');
    }
    return Math.min(retries * 200, 3000);
  }
}

module.exports = RedisClient;
