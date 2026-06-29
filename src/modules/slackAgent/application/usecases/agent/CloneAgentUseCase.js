'use strict';

class CloneAgentUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(command) {
    return this.agentRepository.clone(command.agentId, { name: command.name });
  }
}

module.exports = CloneAgentUseCase;
