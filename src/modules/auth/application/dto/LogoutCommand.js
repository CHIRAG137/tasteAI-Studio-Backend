'use strict';

/**
 * Command object for user logout.
 * Immutable — frozen after construction to prevent accidental mutation.
 */
class LogoutCommand {
  constructor({ userId, refreshToken }) {
    this.userId = userId;
    this.refreshToken = refreshToken;
    Object.freeze(this);
  }
}

module.exports = LogoutCommand;
