'use strict';

const axios = require('axios');

class JoinSlackChannelUseCase {
  constructor({ slackIntegrationRepository }) {
    this.slackIntegrationRepository = slackIntegrationRepository;
  }

  async execute({ userId, channelId }) {
    if (!userId || !channelId) {
      return { slackJoined: false };
    }

    const integration = await this.slackIntegrationRepository.findByUserId(userId);

    if (!integration || !integration.slackAccessToken) {
      return { slackJoined: false };
    }

    try {
      await axios.post(
        'https://slack.com/api/conversations.join',
        { channel: channelId },
        {
          headers: {
            Authorization: `Bearer ${integration.slackAccessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return { slackJoined: true };
    } catch {
      return { slackJoined: false };
    }
  }
}

module.exports = JoinSlackChannelUseCase;
