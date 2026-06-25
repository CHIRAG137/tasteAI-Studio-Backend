'use strict';

const ProvisionBotAgentsUseCase = require('./application/ProvisionBotAgentsUseCase');

const HumanAgentModel = require('../models/HumanAgentModel');
const BotAgentModel = require('../models/BotAgentModel');
const HumanAgentInviteTokenModel = require('../models/HumanAgentInviteTokenModel');

const sendEmail = require('../../../../utils/sendEmailUtil');

function createHumanAgentProvisioningModule() {
  const provisionBotAgentsUseCase = new ProvisionBotAgentsUseCase({
    HumanAgent: HumanAgentModel,
    BotAgent: BotAgentModel,
    HumanAgentInviteToken: HumanAgentInviteTokenModel,
    sendEmail,
  });

  return {
    provisionBotAgentsUseCase,
  };
}

module.exports = {
  createHumanAgentProvisioningModule,
};
