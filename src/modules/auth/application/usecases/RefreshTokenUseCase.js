'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');
const AuthResponseMapper = require('../mapper/AuthResponseMapper');

/**
 * Issues a new access/refresh token pair using a valid refresh token (token rotation).
 */
class RefreshTokenUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/services/ITokenService')} deps.tokenService
   */
  constructor({ tokenService }) {
    super();
    this.tokenService = tokenService;
  }

  async execute(command) {
    const tokens = await this.tokenService.refresh(command.refreshToken);
    return AuthResponseMapper.refresh(tokens);
  }
}

module.exports = RefreshTokenUseCase;
