'use strict';

class CheckMCPHealthUseCase {
  constructor({ mcpRepository }) {
    this.mcpRepository = mcpRepository;
  }

  async execute(command) {
    const { connectionId } = command;
    const server = await this.mcpRepository.findById(connectionId);
    if (!server) throw new Error('MCP server not found');

    const health = await this.mcpRepository.testConnection(connectionId);
    return {
      serverId: connectionId,
      status: health.status,
      latency: health.latency,
      lastCheckAt: new Date(),
      isConnected: server.isConnected,
    };
  }
}

module.exports = CheckMCPHealthUseCase;
