'use strict';

/**
 * Command object for access token refresh.
 * Immutable — frozen after construction to prevent accidental mutation.
 */
class RefreshTokenCommand {
  constructor({ refreshToken }) {
    this.refreshToken = refreshToken;
    Object.freeze(this);
  }
}

module.exports = RefreshTokenCommand;
