'use strict';

class ConnectMCPServerUseCase {
  constructor({ mcpRepository, auditService }) {
    this.mcpRepository = mcpRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { connectionId, organizationId } = command;
    const server = await this.mcpRepository.findById(connectionId);
    if (!server) throw new Error('MCP server not found');

    const testResult = await this.mcpRepository.testConnection(connectionId);
    const updated = await this.mcpRepository.update(connectionId, {
      isConnected: testResult.status === 'healthy',
      healthStatus: testResult.status,
      lastHealthCheckAt: new Date(),
    });

    await this.auditService.log('mcp.server_connected', {
      serverId: connectionId,
      status: testResult.status,
      organizationId,
    });

    return { ...updated, connectionTest: testResult };
  }
}

module.exports = ConnectMCPServerUseCase;
