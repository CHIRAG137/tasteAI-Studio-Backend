'use strict';

class SlackConfiguration {
  constructor({ enabled = false, channelId = null }) {
    this.enabled = enabled;
    this.channelId = channelId;

    this.validate();
  }

  validate() {
    if (this.enabled && !this.channelId) {
      throw new Error('Slack channel id is required');
    }
  }
}

module.exports = SlackConfiguration;
