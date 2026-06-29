'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class EscalationController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  create = async (req, res) => {
    const escalation = await this.slackAgentFacade.createEscalationUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, escalation, 'Escalation rule created');
  };

  list = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getById = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  trigger = async (req, res) => {
    const result = await this.slackAgentFacade.triggerEscalationUseCase.execute({
      escalationId: req.params.escalationId,
      ticketId: req.body.ticketId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.accepted(res, result, 'Escalation triggered');
  };
}

module.exports = EscalationController;
