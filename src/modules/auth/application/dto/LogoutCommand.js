'use strict';

class LogoutCommand {
  constructor({ userId, refreshToken }) {
    this.userId = userId;
    this.refreshToken = refreshToken;
    Object.freeze(this);
  }
}

module.exports = LogoutCommand;
