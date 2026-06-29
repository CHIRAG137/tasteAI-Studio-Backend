'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class AgentController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  create = async (req, res) => {
    const agent = await this.slackAgentFacade.createAgentUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      createdById: req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, agent, 'Agent created successfully');
  };

  list = async (req, res) => {
    const agents = await this.slackAgentFacade.listAgentsUseCase.execute(
      req.user.organizationId || req.user.id,
    );
    return ApiResponse.success(res, agents);
  };

  getById = async (req, res) => {
    const agent = await this.slackAgentFacade.getAgentUseCase.execute(req.params.agentId);
    return ApiResponse.success(res, agent);
  };

  update = async (req, res) => {
    const agent = await this.slackAgentFacade.updateAgentUseCase.execute({
      agentId: req.params.agentId,
      ...req.body,
    });
    return ApiResponse.success(res, agent, 'Agent updated successfully');
  };

  delete = async (req, res) => {
    await this.slackAgentFacade.deleteAgentUseCase.execute({
      agentId: req.params.agentId,
      organizationId: req.user.organizationId || req.user.id,
      createdById: req.user.id,
    });
    return ApiResponse.success(res, null, 'Agent deleted successfully');
  };

  clone = async (req, res) => {
    const agent = await this.slackAgentFacade.cloneAgentUseCase.execute({
      agentId: req.params.agentId,
      name: req.body.name,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.created(res, agent, 'Agent cloned successfully');
  };

  toggle = async (req, res) => {
    const agent = await this.slackAgentFacade.toggleAgentUseCase.execute({
      agentId: req.params.agentId,
      isEnabled: req.body.isEnabled,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(
      res,
      agent,
      `Agent ${req.body.isEnabled ? 'enabled' : 'disabled'} successfully`,
    );
  };

  assignChannels = async (req, res) => {
    const agent = await this.slackAgentFacade.assignAgentChannelsUseCase.execute({
      agentId: req.params.agentId,
      channelIds: req.body.channelIds,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, agent, 'Channels assigned to agent');
  };

  updateSkills = async (req, res) => {
    const agent = await this.slackAgentFacade.updateAgentSkillsUseCase.execute({
      agentId: req.params.agentId,
      skills: req.body.skills,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, agent, 'Agent skills updated');
  };

  updatePermissions = async (req, res) => {
    const agent = await this.slackAgentFacade.updateAgentPermissionsUseCase.execute({
      agentId: req.params.agentId,
      permissions: req.body.permissions,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, agent, 'Agent permissions updated');
  };

  assignMCPServers = async (req, res) => {
    const agent = await this.slackAgentFacade.assignAgentMCPServersUseCase.execute({
      agentId: req.params.agentId,
      mcpServerIds: req.body.mcpServerIds,
      organizationId: req.user.organizationId || req.user.id,
      actorId: req.user.id,
    });
    return ApiResponse.success(res, agent, 'MCP servers assigned to agent');
  };

  assignWebhooks = async (req, res) => {
    const agent = await this.slackAgentFacade.assignAgentWebhooksUseCase.execute({
      agentId: req.params.agentId,
      webhookIds: req.body.webhookIds,
      organizationId: req.user.organizationId || req.user.id,
      actorId: req.user.id,
    });
    return ApiResponse.success(res, agent, 'Webhooks assigned to agent');
  };

  updateConnectors = async (req, res) => {
    const agent = await this.slackAgentFacade.updateAgentConnectorConfigUseCase.execute({
      agentId: req.params.agentId,
      connectorConfig: req.body.connectorConfig,
      slackAiCapabilities: req.body.slackAiCapabilities,
      organizationId: req.user.organizationId || req.user.id,
      actorId: req.user.id,
    });
    return ApiResponse.success(res, agent, 'Connector configuration updated');
  };

  listConnectors = async (req, res) => {
    const connectors = await this.slackAgentFacade.listAgentConnectorsUseCase.execute({
      agentId: req.params.agentId,
    });
    return ApiResponse.success(res, connectors);
  };
}

module.exports = AgentController;
