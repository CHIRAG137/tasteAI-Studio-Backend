'use strict';

class GetMCPServerUseCase {
  constructor({ mcpRepository }) {
    this.mcpRepository = mcpRepository;
  }

  async execute(command) {
    const { connectionId, organizationId } = command;
    const server = await this.mcpRepository.findById(connectionId);
    if (!server) {
      throw new Error('MCP server not found');
    }
    if (server.organizationId.toString() !== organizationId) {
      throw new Error('Access denied');
    }
    return server;
  }
}

module.exports = GetMCPServerUseCase;
