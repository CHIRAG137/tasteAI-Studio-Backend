'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class ClassificationController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  classify = async (req, res) => {
    const result = await this.slackAgentFacade.classifyTicketUseCase.execute({
      ticketId: req.params.ticketId,
      text: req.body.text,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result);
  };

  detectIntent = async (req, res) => {
    const result = await this.slackAgentFacade.detectIntentUseCase.execute({
      text: req.body.text,
      context: req.body.context,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result);
  };

  findSimilar = async (req, res) => {
    const result = await this.slackAgentFacade.findSimilarTicketsUseCase.execute({
      ticketId: req.params.ticketId,
      limit: req.query.limit || 5,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result);
  };

  predictCategory = async (req, res) => {
    return ApiResponse.success(res, { category: null, confidence: 0 });
  };

  predictPriority = async (req, res) => {
    return ApiResponse.success(res, { priority: 'medium', confidence: 0 });
  };

  analyzeSentiment = async (req, res) => {
    return ApiResponse.success(res, { sentiment: 'neutral', score: 0 });
  };

  detectDuplicate = async (req, res) => {
    return ApiResponse.success(res, { isDuplicate: false });
  };

  suggestAssignee = async (req, res) => {
    return ApiResponse.success(res, { suggestedAssignee: null });
  };

  suggestResponse = async (req, res) => {
    return ApiResponse.success(res, { suggestedResponse: '' });
  };
}

module.exports = ClassificationController;
