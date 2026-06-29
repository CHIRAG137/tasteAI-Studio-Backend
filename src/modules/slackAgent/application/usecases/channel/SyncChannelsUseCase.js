'use strict';

class SyncChannelsUseCase {
  constructor({ workspaceRepository, channelRepository, slackApiClient }) {
    this.workspaceRepository = workspaceRepository;
    this.channelRepository = channelRepository;
    this.slackApiClient = slackApiClient;
  }

  async execute(command) {
    const workspace = await this.workspaceRepository.findById(command.workspaceId);
    if (!workspace || !workspace.accessToken) {
      throw new Error('Workspace not found or not authenticated');
    }
    const slackResponse = await this.slackApiClient.listChannels(workspace.accessToken);
    const channels = (slackResponse.channels || []).map((c) => ({
      channelId: c.id,
      channelName: c.name,
      channelTopic: c.topic?.value,
      channelPurpose: c.purpose?.value,
      isMember: c.is_member,
      isPrivate: c.is_private,
      isArchived: c.is_archived,
      memberCount: c.member_count,
      workspaceId: command.workspaceId,
      organizationId: command.organizationId,
    }));
    return this.channelRepository.bulkSave(channels);
  }
}

module.exports = SyncChannelsUseCase;
