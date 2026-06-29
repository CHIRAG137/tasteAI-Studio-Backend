'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class DashboardController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  getExecutive = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getTeam = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getAgent = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getTicket = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getLiveMonitoring = async (req, res) => {
    return ApiResponse.success(res, { activeConversations: 0 });
  };
}

module.exports = DashboardController;
