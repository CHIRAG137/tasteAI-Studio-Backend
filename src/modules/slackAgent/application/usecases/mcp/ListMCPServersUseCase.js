'use strict';

class ListMCPServersUseCase {
  constructor({ mcpRepository }) {
    this.mcpRepository = mcpRepository;
  }

  async execute(command) {
    const { organizationId } = command;
    return this.mcpRepository.findByOrganizationId(organizationId);
  }
}

module.exports = ListMCPServersUseCase;
