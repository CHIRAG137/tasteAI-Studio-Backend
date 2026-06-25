'use strict';

const ProvisionBotAgentsUseCase = require('./application/ProvisionBotAgentsUseCase');

const HumanAgentModel = require('../models/HumanAgentModel');

const BotAgentModel = require('../models/BotAgentModel');

const HumanAgentInviteTokenModel = require('../models/HumanAgentInviteTokenModel');

function createHumanAgentProvisioningModule({ emailService = null } = {}) {
  const provisionBotAgentsUseCase = new ProvisionBotAgentsUseCase({
    HumanAgentModel,
    BotAgentModel,
    HumanAgentInviteTokenModel,
    emailService,
  });

  return {
    provisionBotAgentsUseCase,
  };
}

module.exports = {
  createHumanAgentProvisioningModule,
};
