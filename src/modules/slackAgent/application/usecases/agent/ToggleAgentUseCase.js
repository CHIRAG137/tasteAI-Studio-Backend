'use strict';

class ToggleAgentUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(command) {
    return this.agentRepository.update(command.agentId, { isEnabled: command.isEnabled });
  }
}

module.exports = ToggleAgentUseCase;
