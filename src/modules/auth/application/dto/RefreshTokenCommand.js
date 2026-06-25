'use strict';

class RefreshTokenCommand {
  constructor({ refreshToken }) {
    this.refreshToken = refreshToken;
    Object.freeze(this);
  }
}

module.exports = RefreshTokenCommand;
