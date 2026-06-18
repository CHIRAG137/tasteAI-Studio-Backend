'use strict';

const AuthException = require('./AuthException');

/**
 * Thrown when a requested user does not exist.
 * Returns 401 (not 404) to prevent user-enumeration attacks.
 */
class UserNotFoundException extends AuthException {
  constructor() {
    super('User not found', 'USER_NOT_FOUND');
  }
}

module.exports = UserNotFoundException;
