'use strict';

const { createCustomizationProvisioningModule } = require('./provisioning');

function createCustomizationModule() {
  const provisioningModule = createCustomizationProvisioningModule();

  return {
    ...provisioningModule,
  };
}

module.exports = {
  createCustomizationModule,
};
