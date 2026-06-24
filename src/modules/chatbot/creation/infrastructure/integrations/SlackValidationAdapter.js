'use strict';

const ISlackValidationService = require('../../domain/services/ISlackValidationService');

class SlackValidationAdapter extends ISlackValidationService {
  constructor({ slackIntegrationRepository }) {
    super();

    this.slackIntegrationRepository = slackIntegrationRepository;
  }

  async validate({ userId, slackChannelId }) {
    const integration = await this.slackIntegrationRepository.findByUserId(userId);

    if (!integration) {
      throw new Error('Slack workspace not connected');
    }

    if (!slackChannelId) {
      throw new Error('Slack channel is required');
    }

    return true;
  }
}

module.exports = SlackValidationAdapter;
