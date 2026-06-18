'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');
const UserLoggedOutEvent = require('../../domain/events/UserLoggedOutEvent');

/**
 * Revokes a user's session tokens and publishes a logout event.
 */
class LogoutUserUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/services/ITokenService')} deps.tokenService
   * @param {import('../../domain/services/IEventBus')} deps.eventBus
   */
  constructor({ tokenService, eventBus }) {
    super();
    this.tokenService = tokenService;
    this.eventBus = eventBus;
  }

  async execute(command) {
    await this.tokenService.revoke(command.userId, command.refreshToken);
    this.eventBus.publish(new UserLoggedOutEvent(command.userId));
  }
}

module.exports = LogoutUserUseCase;
