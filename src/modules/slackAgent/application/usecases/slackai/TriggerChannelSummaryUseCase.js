'use strict';

class TriggerChannelSummaryUseCase {
  constructor({ slackAiService, agentRepository, workspaceRepository, channelRepository }) {
    this.slackAiService = slackAiService;
    this.agentRepository = agentRepository;
    this.workspaceRepository = workspaceRepository;
    this.channelRepository = channelRepository;
  }

  async execute(command) {
    const { agentId, channelSlackId, organizationId } = command;

    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const caps = agent.slackAiCapabilities || {};
    if (!caps.enabled || !caps.channelSummary) {
      throw new Error('Channel summary is not enabled for this agent');
    }

    // Find the workspace that has this channel
    const workspaces = await this.workspaceRepository.findByOrganizationId(organizationId);
    let botToken = null;
    let workspaceId = null;

    for (const ws of workspaces) {
      const channel = await this.channelRepository.findByChannelId(ws.id, channelSlackId);
      if (channel) {
        botToken = ws.accessToken || ws.botToken;
        workspaceId = ws.id;
        break;
      }
    }

    if (!botToken) {
      throw new Error("No bot token found for the channel's workspace");
    }

    const summary = await this.slackAiService.generateChannelSummary(
      agent,
      workspaceId,
      channelSlackId,
      botToken,
    );

    return { summary };
  }
}

module.exports = TriggerChannelSummaryUseCase;
