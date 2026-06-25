'use strict';

class LLMValidationAdapter {
  constructor({ validateLLMConnectionUseCase }) {
    this.validateLLMConnectionUseCase = validateLLMConnectionUseCase;
  }

  async validate({ provider, model, encryptedApiKey }) {
    return this.validateLLMConnectionUseCase.execute({
      provider,
      model,
      apiKey: encryptedApiKey,
    });
  }
}

module.exports = LLMValidationAdapter;
