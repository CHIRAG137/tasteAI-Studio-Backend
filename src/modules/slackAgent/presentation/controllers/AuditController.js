'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class AuditController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  list = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getByResource = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getByActor = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getAIDecisions = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getApprovals = async (req, res) => {
    return ApiResponse.success(res, []);
  };
}

module.exports = AuditController;
