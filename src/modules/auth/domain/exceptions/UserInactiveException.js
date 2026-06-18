'use strict';

const AuthException = require('./AuthException');

/** Thrown when an inactive (pending QR verification) user attempts to authenticate. */
class UserInactiveException extends AuthException {
  constructor(message = 'Account not yet activated. Please complete mobile QR verification.') {
    super(message, 'USER_INACTIVE');
  }
}

module.exports = UserInactiveException;
