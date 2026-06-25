'use strict';

class CustomizationProvisioningAdapter {
  constructor({ createDefaultCustomizationUseCase }) {
    if (!createDefaultCustomizationUseCase) {
      throw new Error('createDefaultCustomizationUseCase is required');
    }
    this.createDefaultCustomizationUseCase = createDefaultCustomizationUseCase;
  }

  async createDefaults({ botId, botName }) {
    return this.createDefaultCustomizationUseCase.execute({ botId, botName });
  }
}

module.exports = CustomizationProvisioningAdapter;
