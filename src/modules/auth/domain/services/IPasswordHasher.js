'use strict';

/**
 * Domain service interface for password hashing.
 * @interface
 */
class IPasswordHasher {
  /**
   * Hashes a plaintext password.
   * @param {string} plaintext
   * @returns {Promise<string>} hashed password
   * @abstract
   */

  async hash(plaintext) {
    throw new Error(`${this.constructor.name}.hash() not implemented`);
  }

  /**
   * Compares a plaintext password against a stored hash.
   * @param {string} plaintext
   * @param {string} hashed
   * @returns {Promise<boolean>}
   * @abstract
   */

  async compare(plaintext, hashed) {
    throw new Error(`${this.constructor.name}.compare() not implemented`);
  }
}

module.exports = IPasswordHasher;
