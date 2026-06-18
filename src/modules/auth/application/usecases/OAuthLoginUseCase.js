'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');
const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');
const GoogleOAuthHandler = require('./handlers/GoogleOAuthHandler');
const Auth0OAuthHandler = require('./handlers/Auth0OAuthHandler');

/**
 * Thin orchestrator for OAuth login flows.
 *
 * Delegates all provider-specific logic to dedicated handler classes,
 * keeping this use case small and open for extension (Open/Closed Principle).
 *
 * To add a new OAuth provider:
 *   1. Create a new handler in ./handlers/
 *   2. Register it in the _handlers Map below
 */
class OAuthLoginUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/factories/AuthProviderFactory')} deps.authProviderFactory
   * @param {import('../../domain/repositories/IUserRepository')} deps.userRepository
   * @param {import('../../domain/services/ITokenService')} deps.tokenService
   * @param {import('../../domain/services/IQrService')} deps.qrService
   * @param {import('../../domain/services/IEventBus')} deps.eventBus
   */
  constructor({ authProviderFactory, userRepository, tokenService, qrService, eventBus }) {
    super();
    this.authProviderFactory = authProviderFactory;

    const handlerDeps = { userRepository, tokenService, qrService, eventBus };

    // Map providerType → handler (Strategy pattern)
    this._handlers = new Map([
      [AuthProviderTypes.GOOGLE, new GoogleOAuthHandler(handlerDeps)],
      [AuthProviderTypes.AUTH0, new Auth0OAuthHandler(handlerDeps)],
    ]);
  }

  /**
   * @param {import('../../application/dto/LoginCommand')} command
   * @param {string} providerType - One of AuthProviderTypes
   */
  async execute(command, providerType) {
    const provider = this.authProviderFactory.getProvider(providerType);
    const authResult = await provider.authenticate(command);

    const handler = this._handlers.get(providerType);
    if (!handler) {
      throw new Error(`No OAuth handler registered for provider: "${providerType}"`);
    }

    return handler.handle(authResult, command);
  }
}

module.exports = OAuthLoginUseCase;
