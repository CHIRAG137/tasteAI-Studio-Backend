'use strict';

const AuthResponseMapper = require('../mappers/AuthResponseMapper');

class RefreshTokenUseCase {
  constructor({ tokenService }) {
    this.tokenService = tokenService;
  }

  async execute(command) {
    const tokens = await this.tokenService.refresh(command.refreshToken);
    return AuthResponseMapper.refresh(tokens);
  }
}

module.exports = RefreshTokenUseCase;
