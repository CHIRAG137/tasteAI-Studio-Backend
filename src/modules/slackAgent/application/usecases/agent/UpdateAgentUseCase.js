'use strict';

class UpdateAgentUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(command) {
    return this.agentRepository.update(command.agentId, command);
  }
}

module.exports = UpdateAgentUseCase;
