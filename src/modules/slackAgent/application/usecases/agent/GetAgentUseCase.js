'use strict';

class GetAgentUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(agentId) {
    return this.agentRepository.findById(agentId);
  }
}

module.exports = GetAgentUseCase;
