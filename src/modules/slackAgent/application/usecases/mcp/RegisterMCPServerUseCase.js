'use strict';

class RegisterMCPServerUseCase {
  constructor({ mcpRepository, auditService }) {
    this.mcpRepository = mcpRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const server = await this.mcpRepository.save(command);
    await this.auditService.log('mcp.server_registered', { serverId: server.id, organizationId: command.organizationId });
    return server;
  }
}

module.exports = RegisterMCPServerUseCase;
