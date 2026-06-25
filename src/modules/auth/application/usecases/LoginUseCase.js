'use strict';

/**
 * Generic login use case — works with any AuthStrategy.
 *
 * Instead of having separate use cases for email/password vs OAuth,
 * this delegates to the registered AuthStrategy for the given provider type.
 * Adding a new sign-in method means registering a new AuthStrategy —
 * this class never changes.
 */
class LoginUseCase {
  constructor({ authStrategyFactory }) {
    this.authStrategyFactory = authStrategyFactory;
  }

  async execute(command, providerType) {
    const strategy = this.authStrategyFactory.get(providerType);
    return strategy.login(command);
  }
}

module.exports = LoginUseCase;
