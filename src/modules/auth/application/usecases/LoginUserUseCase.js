'use strict';

const AuthProviderTypes = require('../../infrastructure/providers/AuthProviderTypes');
const { ForbiddenException } = require('../../../shared/exceptions');
const AuthResponseMapper = require('../mappers/AuthResponseMapper');

class LoginUserUseCase {
  constructor({ authProviderFactory, tokenService }) {
    this.authProviderFactory = authProviderFactory;
    this.tokenService = tokenService;
  }

  async execute(command) {
    const provider = this.authProviderFactory.getProvider(AuthProviderTypes.EMAIL_PASSWORD);
    const user = await provider.authenticate(command);

    if (!user.isActive) {
      throw new ForbiddenException(
        'Account not activated. Please complete mobile QR verification.',
      );
    }

    if (user.isBanned) {
      throw new ForbiddenException('Account suspended');
    }

    const tokens = await this.tokenService.issue(user, AuthProviderTypes.EMAIL_PASSWORD, {
      ip: command.ip,
      device: command.userAgent,
      deviceId: command.deviceId,
    });

    return AuthResponseMapper.tokens(user, tokens);
  }
}

module.exports = LoginUserUseCase;
