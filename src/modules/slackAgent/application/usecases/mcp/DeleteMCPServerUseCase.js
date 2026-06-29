'use strict';

class DeleteMCPServerUseCase {
  constructor({ mcpRepository, auditService }) {
    this.mcpRepository = mcpRepository;
    this.auditService = auditService;
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

    await this.mcpRepository.delete(connectionId);
    await this.auditService.log('mcp.server_deleted', { serverId: connectionId, organizationId });
    return { deleted: true };
  }
}

module.exports = DeleteMCPServerUseCase;
