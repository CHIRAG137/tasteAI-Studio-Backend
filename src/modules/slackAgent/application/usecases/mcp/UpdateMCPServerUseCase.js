'use strict';

class UpdateMCPServerUseCase {
  constructor({ mcpRepository, auditService }) {
    this.mcpRepository = mcpRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { connectionId, organizationId, ...data } = command;
    const server = await this.mcpRepository.findById(connectionId);
    if (!server) {
      throw new Error('MCP server not found');
    }
    if (server.organizationId.toString() !== organizationId) {
      throw new Error('Access denied');
    }

    const updated = await this.mcpRepository.update(connectionId, data);
    await this.auditService.log('mcp.server_updated', { serverId: connectionId, organizationId });
    return updated;
  }
}

module.exports = UpdateMCPServerUseCase;
