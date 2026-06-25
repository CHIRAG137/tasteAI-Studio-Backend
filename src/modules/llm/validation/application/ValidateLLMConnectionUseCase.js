'use strict';

class ValidateLLMConnectionUseCase {
  async execute({ provider, apiKey, model }) {
    if (!provider) {
      return true;
    }

    switch (provider) {
      case 'gemini':
        return true;

      case 'openai':
        return true;

      case 'gemma':
        return true;

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}

module.exports = ValidateLLMConnectionUseCase;
