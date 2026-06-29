'use strict';

class DeleteAgentUseCase {
  constructor({ agentRepository, auditService }) {
    this.agentRepository = agentRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { agentId } = command;
    await this.agentRepository.delete(agentId);
    await this.auditService.log('agent.deleted', {
      agentId,
      actorId: command.createdById || command.userId,
    });
  }
}

module.exports = DeleteAgentUseCase;
