'use strict';

class LogoutUserUseCase {
  constructor({ tokenService }) {
    this.tokenService = tokenService;
  }

  async execute(command) {
    await this.tokenService.revoke(command.userId, command.refreshToken);
  }
}

module.exports = LogoutUserUseCase;
