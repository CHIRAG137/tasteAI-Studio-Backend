'use strict';

class UpdateAgentInvocationConfigUseCase {
  constructor({ agentRepository, auditService }) {
    this.agentRepository = agentRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { agentId, invocationConfig, organizationId, actorId } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const updated = await this.agentRepository.update(agentId, { invocationConfig });
    await this.auditService.log('agent.invocation_updated', {
      agentId,
      organizationId,
      actorId,
      modes: Object.keys(invocationConfig).filter((k) => invocationConfig[k]?.enabled),
    });
    return updated;
  }
}

module.exports = UpdateAgentInvocationConfigUseCase;
