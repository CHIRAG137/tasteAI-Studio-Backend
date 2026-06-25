'use strict';

const ValidateLLMConnectionUseCase = require('./application/ValidateLLMConnectionUseCase');

function createLLMValidationModule() {
  const validateLLMConnectionUseCase = new ValidateLLMConnectionUseCase();

  return {
    validateLLMConnectionUseCase,
  };
}

module.exports = {
  createLLMValidationModule,
};
