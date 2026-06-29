'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class MCPController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  register = async (req, res) => {
    const connection = await this.slackAgentFacade.registerMCPServerUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      createdById: req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, connection, 'MCP server registered');
  };

  list = async (req, res) => {
    const organizationId = req.user.organizationId || req.user.id;
    const servers = await this.slackAgentFacade.listMCPServersUseCase.execute({ organizationId });
    return ApiResponse.success(res, servers);
  };

  getById = async (req, res) => {
    const server = await this.slackAgentFacade.getMCPServerUseCase.execute({
      connectionId: req.params.connectionId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, server);
  };

  update = async (req, res) => {
    const updated = await this.slackAgentFacade.updateMCPServerUseCase.execute({
      connectionId: req.params.connectionId,
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.success(res, updated, 'MCP server updated');
  };

  delete = async (req, res) => {
    await this.slackAgentFacade.deleteMCPServerUseCase.execute({
      connectionId: req.params.connectionId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, null, 'MCP server deleted');
  };

  connect = async (req, res) => {
    const result = await this.slackAgentFacade.connectMCPServerUseCase.execute({
      connectionId: req.params.connectionId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result, 'Connected to MCP server');
  };

  disconnect = async (req, res) => {
    await this.slackAgentFacade.disconnectMCPServerUseCase.execute({
      connectionId: req.params.connectionId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, null, 'Disconnected from MCP server');
  };

  listTools = async (req, res) => {
    const tools = await this.slackAgentFacade.listMCPToolsUseCase.execute({
      connectionId: req.params.connectionId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, tools);
  };

  executeTool = async (req, res) => {
    const result = await this.slackAgentFacade.executeMCPToolUseCase.execute({
      connectionId: req.params.connectionId,
      toolName: req.body.toolName,
      arguments: req.body.arguments,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result);
  };

  checkHealth = async (req, res) => {
    const status = await this.slackAgentFacade.checkMCPHealthUseCase.execute({
      connectionId: req.params.connectionId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, status);
  };
}

module.exports = MCPController;
