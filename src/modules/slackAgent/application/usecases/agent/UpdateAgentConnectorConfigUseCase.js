'use strict';

class UpdateAgentConnectorConfigUseCase {
  constructor({ agentRepository, auditService }) {
    this.agentRepository = agentRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { agentId, connectorConfig, slackAiCapabilities, organizationId, actorId } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const updateData = {};
    if (connectorConfig !== undefined) {
      updateData.connectorConfig = connectorConfig;
    }
    if (slackAiCapabilities !== undefined) {
      updateData.slackAiCapabilities = slackAiCapabilities;
    }

    const updated = await this.agentRepository.update(agentId, updateData);
    await this.auditService.log('agent.connectors_updated', { agentId, organizationId, actorId });
    return updated;
  }
}

module.exports = UpdateAgentConnectorConfigUseCase;
