'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class AnalyticsController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  getTicketAnalytics = async (req, res) => {
    const analytics = await this.slackAgentFacade.getTicketAnalyticsUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.query,
    });
    return ApiResponse.success(res, analytics);
  };

  getSLAMetrics = async (req, res) => {
    const metrics = await this.slackAgentFacade.getSLAMetricsUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.query,
    });
    return ApiResponse.success(res, metrics);
  };

  getResolutionMetrics = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getCategoryAnalytics = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getAgentAnalytics = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getUserAnalytics = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  getCostAnalytics = async (req, res) => {
    const analytics = await this.slackAgentFacade.getCostAnalyticsUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.query,
    });
    return ApiResponse.success(res, analytics);
  };

  getLatencyAnalytics = async (req, res) => {
    const analytics = await this.slackAgentFacade.getLatencyAnalyticsUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.query,
    });
    return ApiResponse.success(res, analytics);
  };
}

module.exports = AnalyticsController;
