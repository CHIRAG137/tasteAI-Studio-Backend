'use strict';

const IRedisClient = require('./IRedisClient');
const logger = require('../../../shared/logging');

/**
 * Concrete adapter that fulfils the IRedisClient contract for the auth module.
 *
 * Injects the auth-scoped class-based RedisClient so that:
 *   - The auth module depends only on its own IRedisClient abstraction
 *   - Swapping the underlying Redis client requires changing only this file
 */
class AuthRedisClient extends IRedisClient {
  /**
   * @param {import('../../config/RedisClient')} redisClient - Auth-scoped Redis client
   */
  constructor(redisClient) {
    super();
    if (!redisClient) {
      throw new Error('[AuthRedisClient] redisClient instance is required');
    }
    this._redisClient = redisClient;
  }

  /**
   * Returns the shared Redis connection, establishing it on first call.
   * @private
   * @returns {Promise<import('redis').RedisClientType>}
   */
  async _client() {
    return this._redisClient.getClient();
  }

  /** @override */
  async get(key) {
    const redis = await this._client();
    return redis.get(key);
  }

  /** @override */
  async set(key, value, options = {}) {
    const redis = await this._client();
    await redis.set(key, value, options);
  }

  /** @override */
  async del(...keys) {
    const redis = await this._client();
    await redis.del(keys);
  }

  /**
   * Executes multiple commands atomically in a single Redis pipeline.
   * Each operation is `{ cmd: 'set'|'del', args: [...] }`.
   *
   * @override
   * @param {Array<{ cmd: string, args: any[] }>} operations
   */
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
