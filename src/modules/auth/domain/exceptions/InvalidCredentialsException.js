'use strict';

const AuthException = require('./AuthException');

/** Thrown when email/password credentials do not match. */
class InvalidCredentialsException extends AuthException {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

module.exports = InvalidCredentialsException;
