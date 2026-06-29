'use strict';

class GetAgentInvocationConfigUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(command) {
    const { agentId } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) throw new Error('Agent not found');
    return agent.invocationConfig || {};
  }
}

module.exports = GetAgentInvocationConfigUseCase;
