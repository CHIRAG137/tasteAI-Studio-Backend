'use strict';

const bcrypt = require('bcrypt');
const IPasswordHasher = require('../../domain/services/IPasswordHasher');

const SALT_ROUNDS = 12;

/**
 * bcrypt-based implementation of IPasswordHasher.
 *
 * Kept in the infrastructure layer so the application layer has no dependency on bcrypt.
 * Can be swapped for Argon2 or PBKDF2 without touching any use case code.
 */
class BcryptPasswordHasher extends IPasswordHasher {
  /**
   * Hashes a plaintext password using bcrypt with a configurable work factor.
   * @param {string} plaintext
   * @returns {Promise<string>}
   */
  async hash(plaintext) {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  /**
   * Compares a plaintext candidate against a stored bcrypt hash.
   * Returns false (not throws) when the hash is missing, preventing errors on OAuth-only accounts.
   *
   * @param {string} plaintext
   * @param {string | null | undefined} hashed
   * @returns {Promise<boolean>}
   */
  async compare(plaintext, hashed) {
    if (!hashed) {
      return false;
    }
    return bcrypt.compare(plaintext, hashed);
  }
}

module.exports = BcryptPasswordHasher;
