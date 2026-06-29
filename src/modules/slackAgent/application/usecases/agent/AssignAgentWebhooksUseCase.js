'use strict';

class AssignAgentWebhooksUseCase {
  constructor({ agentRepository, webhookRepository, auditService }) {
    this.agentRepository = agentRepository;
    this.webhookRepository = webhookRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { agentId, webhookIds, organizationId, actorId } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    if (webhookIds && webhookIds.length > 0) {
      for (const whId of webhookIds) {
        const webhook = await this.webhookRepository.findById(whId);
        if (!webhook) throw new Error(`Webhook ${whId} not found`);
      }
    }

    const updated = await this.agentRepository.update(agentId, { webhookIds: webhookIds || [] });
    await this.auditService.log('agent.webhooks_assigned', { agentId, webhookIds, organizationId, actorId });
    return updated;
  }
}

module.exports = AssignAgentWebhooksUseCase;
