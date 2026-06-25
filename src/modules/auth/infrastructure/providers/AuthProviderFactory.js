'use strict';

const { AppException } = require('../../../shared/exceptions');

class AuthProviderFactory {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    this.providers.set(provider.getType(), provider);
  }

  getProvider(type) {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new AppException({
        message: `Unsupported authentication provider: "${type}"`,
        code: 'UNSUPPORTED_PROVIDER',
        statusCode: 400,
      });
    }
    return provider;
  }
}

module.exports = AuthProviderFactory;
