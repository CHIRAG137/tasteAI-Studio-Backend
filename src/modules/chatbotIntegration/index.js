'use strict';

const {
  createCustomizationModule,
  createCustomizationProvisioningModule,
} = require('./customization');

module.exports = {
  createChatbotIntegrationModule: createCustomizationModule,
  createCustomizationModule,
  createCustomizationProvisioningModule,
};
