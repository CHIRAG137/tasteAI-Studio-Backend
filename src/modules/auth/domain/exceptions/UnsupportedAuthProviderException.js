'use strict';

const AuthException = require('./AuthException');

/** Thrown when an unrecognised authentication provider type is requested. */
class UnsupportedAuthProviderException extends AuthException {
  constructor(type) {
    super(`Unsupported authentication provider: "${type}"`, 'UNSUPPORTED_PROVIDER');
  }
}

module.exports = UnsupportedAuthProviderException;
