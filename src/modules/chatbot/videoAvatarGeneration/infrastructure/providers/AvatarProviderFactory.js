'use strict';

class AvatarProviderFactory {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    this.providers.set(provider.getType(), provider);
  }

  getProvider(type) {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Unsupported avatar provider: "${type}"`);
    }
    return provider;
  }
}

module.exports = AvatarProviderFactory;
