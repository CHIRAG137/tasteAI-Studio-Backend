'use strict';

const IHumanAgentProvisioningService = require('../../domain/services/IHumanAgentProvisioningService');

class HumanAgentProvisioningAdapter extends IHumanAgentProvisioningService {
  constructor({ provisionBotAgentsUseCase }) {
    super();

    this.provisionBotAgentsUseCase = provisionBotAgentsUseCase;
  }

  async provision({ botId, invitedBy, emails }) {
    return this.provisionBotAgentsUseCase.execute({
      botId,
      invitedBy,
      emails,
    });
  }
}

module.exports = HumanAgentProvisioningAdapter;
