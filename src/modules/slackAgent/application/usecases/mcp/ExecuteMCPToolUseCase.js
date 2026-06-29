'use strict';

class ExecuteMCPToolUseCase {
  constructor({ mcpRepository, mcpService, auditService }) {
    this.mcpRepository = mcpRepository;
    this.mcpService = mcpService;
    this.auditService = auditService;
  }

  async execute(command) {
    const server = await this.mcpRepository.findById(command.serverId);
    const result = await this.mcpService.executeTool(server, command.toolName, command.args);
    await this.auditService.log('mcp.tool_executed', { serverId: command.serverId, toolName: command.toolName });
    return result;
  }
}

module.exports = ExecuteMCPToolUseCase;
