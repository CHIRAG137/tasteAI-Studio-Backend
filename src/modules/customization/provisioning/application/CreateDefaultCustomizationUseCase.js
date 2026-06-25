'use strict';

class CreateDefaultCustomizationUseCase {
  constructor({ customizationRepository }) {
    this.customizationRepository = customizationRepository;
  }

  async execute({ botId }) {
    return this.customizationRepository.create({
      botId,
    });
  }
}

module.exports = CreateDefaultCustomizationUseCase;
