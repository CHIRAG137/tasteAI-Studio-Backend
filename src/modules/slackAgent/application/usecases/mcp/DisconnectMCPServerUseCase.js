'use strict';

class DisconnectMCPServerUseCase {
  constructor({ mcpRepository, auditService }) {
    this.mcpRepository = mcpRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { connectionId, organizationId } = command;
    const server = await this.mcpRepository.findById(connectionId);
    if (!server) throw new Error('MCP server not found');

    const updated = await this.mcpRepository.update(connectionId, {
      isConnected: false,
      healthStatus: 'unknown',
    });

    await this.auditService.log('mcp.server_disconnected', { serverId: connectionId, organizationId });
    return updated;
  }
}

module.exports = DisconnectMCPServerUseCase;
