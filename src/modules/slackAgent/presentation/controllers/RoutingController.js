'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class RoutingController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  createRule = async (req, res) => {
    const rule = await this.slackAgentFacade.createRoutingRuleUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, rule, 'Routing rule created');
  };

  listRules = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  updateRule = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  deleteRule = async (req, res) => {
    return ApiResponse.success(res, null, 'Routing rule deleted');
  };

  routeTicket = async (req, res) => {
    const result = await this.slackAgentFacade.routeTicketUseCase.execute({
      ticketId: req.body.ticketId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result, 'Ticket routed');
  };
}

module.exports = RoutingController;
