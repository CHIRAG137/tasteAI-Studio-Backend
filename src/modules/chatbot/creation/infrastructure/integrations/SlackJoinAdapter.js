'use strict';

class SlackJoinAdapter {
  constructor({ joinSlackChannelUseCase }) {
    this.joinSlackChannelUseCase = joinSlackChannelUseCase;
  }

  async join({ userId, channelId }) {
    return this.joinSlackChannelUseCase.execute({ userId, channelId });
  }
}

module.exports = SlackJoinAdapter;
