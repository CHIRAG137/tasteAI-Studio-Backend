'use strict';

const AuthProviderType = require('../../infrastructure/strategies/auth/AuthProviderType');

/**
 * Generic register use case — works with any AuthStrategy that supports registration.
 *
 * Most OAuth strategies don't support explicit registration
 * (users are created on first login). Email/password does by default.
 * Pass a different providerType to register via another provider.
 */
class RegisterUseCase {
  constructor({ authStrategyFactory }) {
    this.authStrategyFactory = authStrategyFactory;
  }

  async execute(command, providerType) {
    const strategy = this.authStrategyFactory.get(providerType || AuthProviderType.EMAIL_PASSWORD);
    return strategy.register(command);
  }
}

module.exports = RegisterUseCase;
