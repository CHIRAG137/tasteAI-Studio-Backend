'use strict';

const AuthProviderTypes = require('../../infrastructure/providers/AuthProviderTypes');
const GoogleOAuthHandler = require('./handlers/GoogleOAuthHandler');
const Auth0OAuthHandler = require('./handlers/Auth0OAuthHandler');

class OAuthLoginUseCase {
  constructor({ authProviderFactory, userRepository, tokenService, qrService, eventBus }) {
    this.authProviderFactory = authProviderFactory;

    const handlerDeps = { userRepository, tokenService, qrService, eventBus };

    this._handlers = new Map([
      [AuthProviderTypes.GOOGLE, new GoogleOAuthHandler(handlerDeps)],
      [AuthProviderTypes.AUTH0, new Auth0OAuthHandler(handlerDeps)],
    ]);
  }

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
