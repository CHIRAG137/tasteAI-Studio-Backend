'use strict';

/**
 * Interface representing a Redis client used within the auth module.
 * @interface
 */
class IRedisClient {
  /**
   * Get the value of a key.
   * @param {string} key
   * @returns {Promise<string | null>}
   */

  async get(key) {
    throw new Error(`${this.constructor.name}.get() not implemented`);
  }

  /**
   * Set a key to a string value with optional TTL.
   * @param {string} key
   * @param {string} value
   * @param {{ EX?: number }} [options]
   * @returns {Promise<void>}
   */

  async set(key, value, options) {
    throw new Error(`${this.constructor.name}.set() not implemented`);
  }

  /**
   * Delete one or more keys.
   * @param {...string} keys
   * @returns {Promise<void>}
   */

  async del(...keys) {
    throw new Error(`${this.constructor.name}.del() not implemented`);
  }

  /**
   * Execute multiple commands in a single round-trip (pipeline).
   * @param {Array<{ cmd: 'set'|'del', args: any[] }>} operations
   * @returns {Promise<void>}
   */

  async pipeline(operations) {
    throw new Error(`${this.constructor.name}.pipeline() not implemented`);
  }
}

module.exports = IRedisClient;
