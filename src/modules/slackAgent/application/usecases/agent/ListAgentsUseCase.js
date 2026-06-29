'use strict';

class ListAgentsUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(organizationId) {
    return this.agentRepository.findByOrganizationId(organizationId);
  }
}

module.exports = ListAgentsUseCase;
