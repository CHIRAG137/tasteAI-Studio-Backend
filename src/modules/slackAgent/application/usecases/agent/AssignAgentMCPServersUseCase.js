'use strict';

class AssignAgentMCPServersUseCase {
  constructor({ agentRepository, mcpRepository, auditService }) {
    this.agentRepository = agentRepository;
    this.mcpRepository = mcpRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { agentId, mcpServerIds, organizationId, actorId } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    if (mcpServerIds && mcpServerIds.length > 0) {
      for (const mcpId of mcpServerIds) {
        const server = await this.mcpRepository.findById(mcpId);
        if (!server) {
          throw new Error(`MCP server ${mcpId} not found`);
        }
      }
    }

    const updated = await this.agentRepository.update(agentId, {
      mcpServerIds: mcpServerIds || [],
    });
    await this.auditService.log('agent.mcp_servers_assigned', {
      agentId,
      mcpServerIds,
      organizationId,
      actorId,
    });
    return updated;
  }
}

module.exports = AssignAgentMCPServersUseCase;
