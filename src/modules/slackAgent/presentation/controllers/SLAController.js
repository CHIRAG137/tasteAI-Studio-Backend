'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class SLAController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  create = async (req, res) => {
    const sla = await this.slackAgentFacade.createSLAUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, sla, 'SLA policy created');
  };

  list = async (req, res) => {
    const slas = await this.slackAgentFacade.listSLAsUseCase.execute(req.user.organizationId || req.user.id);
    return ApiResponse.success(res, slas);
  };

  getById = async (req, res) => {
    const sla = await this.slackAgentFacade.getSLAUseCase.execute(req.params.slaId);
    return ApiResponse.success(res, sla);
  };

  update = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  delete = async (req, res) => {
    return ApiResponse.success(res, null, 'SLA policy deleted');
  };
}

module.exports = SLAController;
