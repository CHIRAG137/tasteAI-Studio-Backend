'use strict';

const IHumanAgentProvisioningService = require('../../domain/services/IHumanAgentProvisioningService');

class HumanAgentProvisioningAdapter extends IHumanAgentProvisioningService {
  constructor({ humanAgentProvisioningService }) {
    super();

    this.humanAgentProvisioningService = humanAgentProvisioningService;
  }

  async provision({ botId, invitedBy, emails }) {
    return this.humanAgentProvisioningService.syncBotAndHumanAgents({
      botId,
      invitedBy,
      emails,
    });
  }
}

module.exports = HumanAgentProvisioningAdapter;
