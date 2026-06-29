'use strict';

class ListAgentConnectorsUseCase {
  constructor({ agentRepository, mcpRepository, webhookRepository }) {
    this.agentRepository = agentRepository;
    this.mcpRepository = mcpRepository;
    this.webhookRepository = webhookRepository;
  }

  async execute(command) {
    const { agentId } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const mcpServers =
      agent.mcpServerIds && agent.mcpServerIds.length > 0
        ? await this.mcpRepository.findAll({ _id: { $in: agent.mcpServerIds } })
        : [];

    const webhooks =
      agent.webhookIds && agent.webhookIds.length > 0
        ? await this.webhookRepository.findAll({ _id: { $in: agent.webhookIds } })
        : [];

    return {
      mcpServers,
      webhooks,
      slackAiCapabilities: agent.slackAiCapabilities || { enabled: false },
      connectorConfig: agent.connectorConfig || {},
      assignedChannels: agent.assignedChannelIds || [],
      skills: agent.skills || [],
    };
  }
}

module.exports = ListAgentConnectorsUseCase;
