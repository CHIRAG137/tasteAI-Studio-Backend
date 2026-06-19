'use strict';

const IRedisClient = require('./IRedisClient');
const { getRedis } = require('../../../../../config/redisClient');
const logger = require('../../../shared/logging');

/**
 * Concrete adapter that fulfils the IRedisClient contract for the auth module.
 *
 * Wraps the shared `config/redisClient.getRedis()` lazy singleton so that:
 *   - The auth module depends only on its own IRedisClient abstraction
 *   - The root-level Redis connection is still shared across the process
 *   - Swapping the underlying Redis lib requires changing only this file
 */
class AuthRedisClient extends IRedisClient {
  /**
   * Returns the shared Redis connection, establishing it on first call.
   * @private
   * @returns {Promise<import('redis').RedisClientType>}
   */
  async _client() {
    return getRedis();
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
