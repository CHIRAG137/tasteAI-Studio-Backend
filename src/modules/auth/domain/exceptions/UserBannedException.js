'use strict';

const AuthException = require('./AuthException');

/** Thrown when a banned user attempts to authenticate. */
class UserBannedException extends AuthException {
  constructor(message = 'Your account has been suspended. Please contact support.') {
    super(message, 'USER_BANNED');
  }
}

module.exports = UserBannedException;
