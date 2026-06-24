'use strict';

const ICustomizationProvisioningService = require('../../domain/services/ICustomizationProvisioningService');

class CustomizationProvisioningAdapter extends ICustomizationProvisioningService {
  constructor({ customizationService }) {
    super();

    this.customizationService = customizationService;
  }

  async createDefaults({ botId }) {
    return this.customizationService.createDefaultCustomization({
      botId,
    });
  }
}

module.exports = CustomizationProvisioningAdapter;
