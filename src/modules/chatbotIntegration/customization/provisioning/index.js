'use strict';

const CreateDefaultCustomizationUseCase = require('./application/CreateDefaultCustomizationUseCase');

const CustomizationRepository = require('../repositories/CustomizationRepository');

const CustomizationModel = require('../models/CustomizationModel');

function createCustomizationProvisioningModule() {
  const customizationRepository = new CustomizationRepository({
    CustomizationModel,
  });

  const createDefaultCustomizationUseCase = new CreateDefaultCustomizationUseCase({
    customizationRepository,
  });

  return {
    createDefaultCustomizationUseCase,
  };
}

module.exports = {
  createCustomizationProvisioningModule,
};
