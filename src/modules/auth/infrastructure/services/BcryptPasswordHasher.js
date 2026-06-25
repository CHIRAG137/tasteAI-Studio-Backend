'use strict';

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

class BcryptPasswordHasher {
  async hash(plaintext) {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  async compare(plaintext, hashed) {
    if (!hashed) {
      return false;
    }
    return bcrypt.compare(plaintext, hashed);
  }
}

module.exports = BcryptPasswordHasher;
