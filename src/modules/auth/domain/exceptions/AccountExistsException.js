'use strict';

const AuthException = require('./AuthException');

/** Thrown when registering with an email that already has a password set. */
class AccountExistsException extends AuthException {
  constructor() {
    super('An account with this email already exists.', 'ACCOUNT_EXISTS');
  }
}

module.exports = AccountExistsException;
