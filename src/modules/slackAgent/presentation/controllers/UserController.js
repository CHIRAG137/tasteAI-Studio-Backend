'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class UserController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  sync = async (req, res) => {
    const users = await this.slackAgentFacade.syncSlackUsersUseCase.execute({
      workspaceId: req.params.workspaceId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, users, 'Users synced successfully');
  };

  list = async (req, res) => {
    const users = await this.slackAgentFacade.listSlackUsersUseCase.execute(req.params.workspaceId);
    return ApiResponse.success(res, users);
  };

  lookup = async (req, res) => {
    const user = await this.slackAgentFacade.lookupSlackUserUseCase.execute(req.params.workspaceId, req.params.slackUserId);
    return ApiResponse.success(res, user);
  };

  getUserGroups = async (req, res) => {
    return ApiResponse.success(res, []); // Placeholder
  };

  getTeams = async (req, res) => {
    return ApiResponse.success(res, []); // Placeholder
  };
}

module.exports = UserController;
