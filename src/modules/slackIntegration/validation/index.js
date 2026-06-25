'use strict';

const ValidateSlackWorkspaceUseCase = require('./application/ValidateSlackWorkspaceUseCase');

const SlackIntegrationRepository = require('../repositories/SlackIntegrationRepository');

const SlackIntegrationModel = require('../models/SlackIntegrationModel');

function createSlackValidationModule() {
  const slackIntegrationRepository = new SlackIntegrationRepository({
    SlackIntegrationModel,
  });

  const validateSlackWorkspaceUseCase = new ValidateSlackWorkspaceUseCase({
    slackIntegrationRepository,
  });

  return {
    validateSlackWorkspaceUseCase,
  };
}

module.exports = {
  createSlackValidationModule,
};
