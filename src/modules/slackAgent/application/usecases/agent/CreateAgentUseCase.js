'use strict';

class CreateAgentUseCase {
  constructor({ agentRepository, auditService }) {
    this.agentRepository = agentRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const agent = await this.agentRepository.save(command);
    await this.auditService.log('agent.created', { agentId: agent.id, organizationId: command.organizationId, actorId: command.createdById || command.userId });
    return agent;
  }
}

module.exports = CreateAgentUseCase;
