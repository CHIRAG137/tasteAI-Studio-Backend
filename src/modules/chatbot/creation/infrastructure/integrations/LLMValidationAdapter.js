'use strict';

const ILLMValidationService = require('../../domain/services/ILLMValidationService');

class LLMValidationAdapter extends ILLMValidationService {
  constructor({ validateLLMConnectionUseCase }) {
    super();

    this.validateLLMConnectionUseCase = validateLLMConnectionUseCase;
  }

  async validate(payload) {
    return this.validateLLMConnectionUseCase.execute(payload);
  }
}

module.exports = LLMValidationAdapter;
