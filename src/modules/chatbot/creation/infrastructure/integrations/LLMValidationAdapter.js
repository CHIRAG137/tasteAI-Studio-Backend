'use strict';

const ILLMValidationService = require('../../domain/services/ILLMValidationService');

class LLMValidationAdapter extends ILLMValidationService {
  constructor({ llmConnectionTester }) {
    super();

    this.llmConnectionTester = llmConnectionTester;
  }

  async validate({ provider, model, encryptedApiKey }) {
    const result = await this.llmConnectionTester({
      provider,
      model,
      encryptedApiKey,
    });

    if (!result.success) {
      throw new Error(result.message || 'Unable to validate LLM connection');
    }

    return true;
  }
}

module.exports = LLMValidationAdapter;
