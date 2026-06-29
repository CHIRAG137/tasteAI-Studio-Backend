'use strict';

class ListMCPToolsUseCase {
  constructor({ mcpRepository }) {
    this.mcpRepository = mcpRepository;
  }

  async execute(command) {
    const { connectionId, organizationId } = command;
    const server = await this.mcpRepository.findById(connectionId);
    if (!server) throw new Error('MCP server not found');

    return server.tools || [];
  }
}

module.exports = ListMCPToolsUseCase;
