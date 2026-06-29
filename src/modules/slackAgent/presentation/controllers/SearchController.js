'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class SearchController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  global = async (req, res) => {
    const results = await this.slackAgentFacade.globalSearchUseCase.execute({
      query: req.query.q,
      organizationId: req.user.organizationId || req.user.id,
      types: req.query.types ? req.query.types.split(',') : undefined,
      limit: req.query.limit || 20,
      offset: req.query.offset || 0,
    });
    return ApiResponse.success(res, results);
  };

  tickets = async (req, res) => {
    const tickets = await this.slackAgentFacade.ticketSearchUseCase.execute({
      query: req.query.q,
      organizationId: req.user.organizationId || req.user.id,
      ...req.query,
    });
    return ApiResponse.success(res, tickets);
  };

  conversations = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  knowledge = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  users = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  channels = async (req, res) => {
    return ApiResponse.success(res, []);
  };
}

module.exports = SearchController;
