'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class WorkspaceController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  install = async (req, res) => {
    const result = await this.slackAgentFacade.installWorkspaceUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      userId: req.user.id,
      authCode: req.body.code,
      redirectUri: req.body.redirectUri,
    });
    return ApiResponse.created(res, result, 'Slack workspace installed successfully');
  };

  getOAuthUrl = async (req, res) => {
    const state = encodeURIComponent(JSON.stringify({ userId: req.user.id }));
    const redirectUri = req.query.redirectUri || process.env.SLACK_REDIRECT_URI;
    const url = `https://slack.com/oauth/v2/authorize?client_id=${
      process.env.SLACK_CLIENT_ID
    }&scope=chat:write,chat:write.customize,commands,users:read,channels:read,channels:join,groups:write,app_mentions:read,channels:history,groups:history,im:history,reactions:read&user_scope=&redirect_uri=${
      encodeURIComponent(redirectUri)
    }&state=${state}`;
    return ApiResponse.success(res, { url, redirectUri });
  };

  list = async (req, res) => {
    const workspaces = await this.slackAgentFacade.listWorkspacesUseCase.execute(req.user.organizationId || req.user.id);
    return ApiResponse.success(res, workspaces);
  };

  getById = async (req, res) => {
    const workspace = await this.slackAgentFacade.getWorkspaceInfoUseCase.execute(req.params.workspaceId);
    return ApiResponse.success(res, workspace);
  };

  sync = async (req, res) => {
    const result = await this.slackAgentFacade.syncWorkspaceUseCase.execute({
      workspaceId: req.params.workspaceId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result, 'Workspace synced successfully');
  };

  updateSettings = async (req, res) => {
    const result = await this.slackAgentFacade.updateWorkspaceSettingsUseCase.execute({
      workspaceId: req.params.workspaceId,
      settings: req.body.settings,
    });
    return ApiResponse.success(res, result, 'Workspace settings updated');
  };

  disconnect = async (req, res) => {
    await this.slackAgentFacade.disconnectWorkspaceUseCase.execute({
      workspaceId: req.params.workspaceId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, null, 'Workspace disconnected successfully');
  };
}

module.exports = WorkspaceController;
