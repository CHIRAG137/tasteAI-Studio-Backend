'use strict';

const ICustomizationProvisioningService = require('../../domain/services/ICustomizationProvisioningService');

class CustomizationProvisioningAdapter extends ICustomizationProvisioningService {
  constructor({ createDefaultCustomizationUseCase }) {
    super();

    this.createDefaultCustomizationUseCase = createDefaultCustomizationUseCase;
  }

  async createDefaults({ botId }) {
    return this.createDefaultCustomizationUseCase.execute({
      botId,
    });
  }
}

module.exports = CustomizationProvisioningAdapter;
