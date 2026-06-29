'use strict';

class ListSlackUsersUseCase {
  constructor({ slackUserRepository }) {
    this.slackUserRepository = slackUserRepository;
  }

  async execute(workspaceId) {
    return this.slackUserRepository.findByWorkspaceId(workspaceId);
  }
}

module.exports = ListSlackUsersUseCase;
