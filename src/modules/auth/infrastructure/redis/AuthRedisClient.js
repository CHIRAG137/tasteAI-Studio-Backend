'use strict';

const logger = require('../../../shared/logging');

class AuthRedisClient {
  constructor(redisClient) {
    if (!redisClient) {
      throw new Error('[AuthRedisClient] redisClient instance is required');
    }
    this._redisClient = redisClient;
  }

  async _client() {
    return this._redisClient.getClient();
  }

  async get(key) {
    const redis = await this._client();
    return redis.get(key);
  }

  async set(key, value, options = {}) {
    const redis = await this._client();
    await redis.set(key, value, options);
  }

  async del(...keys) {
    const redis = await this._client();
    await redis.del(keys);
  }

  async pipeline(operations) {
    const redis = await this._client();
    const pipe = redis.multi();

    for (const { cmd, args } of operations) {
      if (typeof pipe[cmd] !== 'function') {
        logger.warn(`AuthRedisClient.pipeline: unknown command "${cmd}" — skipped`);
        continue;
      }
      pipe[cmd](...args);
    }

    await pipe.exec();
  }
}

module.exports = AuthRedisClient;
