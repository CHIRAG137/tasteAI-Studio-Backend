'use strict';

class AddMonitoredChannelUseCase {
  constructor({ channelRepository, workspaceRepository, slackApiClient }) {
    this.channelRepository = channelRepository;
    this.workspaceRepository = workspaceRepository;
    this.slackApiClient = slackApiClient;
  }

  async execute(command) {
    const channel = await this.channelRepository.findById(command.channelId);
    const workspace = await this.workspaceRepository.findById(channel.workspaceId);
    await this.slackApiClient.joinChannel(workspace.accessToken, channel.channelId);
    return this.channelRepository.update(command.channelId, { isMonitored: true });
  }
}

module.exports = AddMonitoredChannelUseCase;
