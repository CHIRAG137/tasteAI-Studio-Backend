'use strict';

class LookupSlackUserUseCase {
  constructor({ slackUserRepository }) {
    this.slackUserRepository = slackUserRepository;
  }

  async execute(workspaceId, slackUserId) {
    return this.slackUserRepository.findBySlackUserId(workspaceId, slackUserId);
  }
}

module.exports = LookupSlackUserUseCase;
