'use strict';

class LLMConfiguration {
  constructor({ provider = null, model = null, apiKeySource = 'user', encryptedApiKey = null }) {
    this.provider = provider;
    this.model = model;
    this.apiKeySource = apiKeySource;
    this.encryptedApiKey = encryptedApiKey;

    this.validate();
  }

  validate() {
    if (!this.provider) {
      return;
    }

    const providers = ['gemini', 'openai', 'gemma'];

    if (!providers.includes(this.provider)) {
      throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }
}

module.exports = LLMConfiguration;
