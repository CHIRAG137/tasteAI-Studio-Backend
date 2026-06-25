'use strict';

class ValidateSlackWorkspaceUseCase {
  constructor({ slackIntegrationRepository }) {
    this.slackIntegrationRepository = slackIntegrationRepository;
  }

  async execute({ userId, slackEnabled }) {
    if (!slackEnabled) {
      return true;
    }

    const integration = await this.slackIntegrationRepository.findByUserId(userId);

    if (!integration) {
      throw new Error('Slack workspace not connected');
    }

    return true;
  }
}

module.exports = ValidateSlackWorkspaceUseCase;
