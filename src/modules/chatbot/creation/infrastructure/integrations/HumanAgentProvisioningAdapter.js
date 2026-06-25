'use strict';

class HumanAgentProvisioningAdapter {
  constructor({ provisionBotAgentsUseCase }) {
    this.provisionBotAgentsUseCase = provisionBotAgentsUseCase;
  }

  async provision({ botId, invitedBy, emails, botName }) {
    return this.provisionBotAgentsUseCase.execute({
      botId,
      invitedBy,
      emails,
      botName,
    });
  }
}

module.exports = HumanAgentProvisioningAdapter;
