'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class WorkflowController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  create = async (req, res) => {
    const workflow = await this.slackAgentFacade.createWorkflowUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      createdById: req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, workflow, 'Workflow created');
  };

  list = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getById = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  update = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  delete = async (req, res) => {
    return ApiResponse.success(res, null, 'Workflow deleted');
  };

  execute = async (req, res) => {
    const execution = await this.slackAgentFacade.executeWorkflowUseCase.execute({
      workflowId: req.params.workflowId,
      input: req.body.input,
      triggeredBy: req.user.id,
    });
    return ApiResponse.accepted(res, execution, 'Workflow execution started');
  };

  getHistory = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getLogs = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getTemplates = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  approveStep = async (req, res) => {
    return ApiResponse.success(res, {}, 'Step approved');
  };
}

module.exports = WorkflowController;
