'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');
const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');
const UserLoggedInEvent = require('../../domain/events/UserLoggedInEvent');
const AuthResponseMapper = require('../mappers/AuthResponseMapper');

/**
 * Handles email + password login.
 * Delegates credential verification to the EmailPasswordAuthProvider.
 */
class LoginUserUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/factories/AuthProviderFactory')} deps.authProviderFactory
   * @param {import('../../domain/services/ITokenService')} deps.tokenService
   * @param {import('../../domain/services/IEventBus')} deps.eventBus
   */
  constructor({ authProviderFactory, tokenService, eventBus }) {
    super();
    this.authProviderFactory = authProviderFactory;
    this.tokenService = tokenService;
    this.eventBus = eventBus;
  }

  async execute(command) {
    const provider = this.authProviderFactory.getProvider(AuthProviderTypes.EMAIL_PASSWORD);
    const user = await provider.authenticate(command);

    // Throws UserInactiveException or UserBannedException if ineligible
    user.isEligibleToLogin();

    const tokens = await this.tokenService.issue(user, AuthProviderTypes.EMAIL_PASSWORD, {
      ip: command.ip,
      device: command.userAgent,
      deviceId: command.deviceId,
    });

    this.eventBus.publish(new UserLoggedInEvent(user.id, AuthProviderTypes.EMAIL_PASSWORD));

    return AuthResponseMapper.tokens(user, tokens);
  }
}

module.exports = LoginUserUseCase;
