'use strict';

class SyncSlackUsersUseCase {
  constructor({ workspaceRepository, slackUserRepository, slackApiClient }) {
    this.workspaceRepository = workspaceRepository;
    this.slackUserRepository = slackUserRepository;
    this.slackApiClient = slackApiClient;
  }

  async execute(command) {
    const workspace = await this.workspaceRepository.findById(command.workspaceId);
    const slackResponse = await this.slackApiClient.listUsers(workspace.accessToken);
    return this.slackUserRepository.bulkSave((slackResponse.members || []).map(u => ({ ...u, workspaceId: command.workspaceId, organizationId: command.organizationId })));
  }
}

module.exports = SyncSlackUsersUseCase;
