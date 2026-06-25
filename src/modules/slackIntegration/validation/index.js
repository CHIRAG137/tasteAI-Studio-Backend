'use strict';

const ValidateSlackWorkspaceUseCase = require('./application/ValidateSlackWorkspaceUseCase');
const JoinSlackChannelUseCase = require('../application/JoinSlackChannelUseCase');

const SlackIntegrationRepository = require('../repositories/SlackIntegrationRepository');
const SlackIntegrationModel = require('../models/SlackIntegrationModel');

function createSlackValidationModule() {
  const slackIntegrationRepository = new SlackIntegrationRepository({
    SlackIntegrationModel,
  });

  const validateSlackWorkspaceUseCase = new ValidateSlackWorkspaceUseCase({
    slackIntegrationRepository,
  });

  const joinSlackChannelUseCase = new JoinSlackChannelUseCase({
    slackIntegrationRepository,
  });

  return {
    validateSlackWorkspaceUseCase,
    joinSlackChannelUseCase,
  };
}

module.exports = {
  createSlackValidationModule,
};
