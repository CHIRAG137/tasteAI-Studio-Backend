'use strict';

const ICustomizationProvisioningService = require('../../domain/services/ICustomizationProvisioningService');

class CustomizationProvisioningAdapter extends ICustomizationProvisioningService {
  constructor({ createDefaultCustomizationUseCase }) {
    super();

    if (!createDefaultCustomizationUseCase) {
      throw new Error('createDefaultCustomizationUseCase is required');
    }

    this.createDefaultCustomizationUseCase = createDefaultCustomizationUseCase;
  }

  async createDefaults({ botId }) {
    return this.createDefaultCustomizationUseCase.execute({
      botId,
    });
  }
}

module.exports = CustomizationProvisioningAdapter;
