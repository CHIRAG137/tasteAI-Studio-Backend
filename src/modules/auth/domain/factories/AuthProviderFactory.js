'use strict';

const UnsupportedAuthProviderException = require('../exceptions/UnsupportedAuthProviderException');

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
      throw new UnsupportedAuthProviderException(type);
    }

    return provider;
  }
}

module.exports = AuthProviderFactory;
