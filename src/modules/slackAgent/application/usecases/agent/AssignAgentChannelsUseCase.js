'use strict';

class AssignAgentChannelsUseCase {
  constructor({ agentRepository, channelRepository, slackApiClient, workspaceRepository }) {
    this.agentRepository = agentRepository;
    this.channelRepository = channelRepository;
    this.slackApiClient = slackApiClient;
    this.workspaceRepository = workspaceRepository;
  }

  async execute(command) {
    const { agentId, channelIds } = command;

    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const previousIds = (agent.assignedChannelIds || []).map((id) => id.toString());
    const newIds = channelIds.filter((id) => !previousIds.includes(id));

    // Auto-join new Slack channels
    for (const mongoChannelId of newIds) {
      try {
        const channel = await this.channelRepository.findById(mongoChannelId);
        if (!channel) {
          continue;
        }

        const workspace = await this.workspaceRepository.findById(channel.workspaceId);
        const botToken = workspace?.accessToken;
        if (!botToken) {
          continue;
        }

        await this.slackApiClient.joinChannel(botToken, channel.channelId);

        // Mark channel as member
        await this.channelRepository.update(mongoChannelId, { isMember: true });
      } catch (err) {
        // Skip channels the bot can't join (e.g., already a member, no permission)
        console.warn(`Failed to join channel ${mongoChannelId}: ${err.message}`);
      }
    }

    return this.agentRepository.update(agentId, { assignedChannelIds: channelIds });
  }
}

module.exports = AssignAgentChannelsUseCase;
