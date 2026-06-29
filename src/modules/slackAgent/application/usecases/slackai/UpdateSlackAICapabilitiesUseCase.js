'use strict';

class UpdateSlackAICapabilitiesUseCase {
  constructor({ agentRepository, auditService }) {
    this.agentRepository = agentRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { agentId, slackAiCapabilities, organizationId, actorId } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const updated = await this.agentRepository.update(agentId, { slackAiCapabilities });
    await this.auditService.log('agent.slack_ai_updated', {
      agentId,
      slackAiCapabilities,
      organizationId,
      actorId,
    });
    return updated;
  }
}

module.exports = UpdateSlackAICapabilitiesUseCase;
