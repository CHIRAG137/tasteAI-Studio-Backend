'use strict';

class SyncWorkspaceUseCase {
  constructor({ workspaceRepository, slackApiClient }) {
    this.workspaceRepository = workspaceRepository;
    this.slackApiClient = slackApiClient;
  }

  async execute(command) {
    const workspace = await this.workspaceRepository.findById(command.workspaceId);
    const slackResponse = await this.slackApiClient.getWorkspaceInfo(workspace.accessToken);
    return this.workspaceRepository.update(command.workspaceId, slackResponse.team);
  }
}

module.exports = SyncWorkspaceUseCase;
