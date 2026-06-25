'use strict';

const { createSlackValidationModule } = require('./validation');

function createSlackIntegrationModule() {
  const validationModule = createSlackValidationModule();

  return {
    ...validationModule,
  };
}

module.exports = {
  createSlackIntegrationModule,
};
