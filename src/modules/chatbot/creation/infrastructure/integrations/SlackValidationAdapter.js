'use strict';

class SlackValidationAdapter {
  constructor({ validateSlackWorkspaceUseCase }) {
    this.validateSlackWorkspaceUseCase = validateSlackWorkspaceUseCase;
  }

  async validate({ userId, slackChannelId }) {
    return this.validateSlackWorkspaceUseCase.execute({
      userId,
      slackEnabled: Boolean(slackChannelId),
    });
  }
}

module.exports = SlackValidationAdapter;
