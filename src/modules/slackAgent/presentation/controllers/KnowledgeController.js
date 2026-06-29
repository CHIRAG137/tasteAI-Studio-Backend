'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class KnowledgeController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  upload = async (req, res) => {
    const knowledge = await this.slackAgentFacade.uploadKnowledgeUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      uploadedById: req.user.id,
      ...req.body,
      fileUrl: req.file?.path,
    });
    return ApiResponse.created(res, knowledge, 'Knowledge uploaded');
  };

  list = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getById = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  index = async (req, res) => {
    const result = await this.slackAgentFacade.indexKnowledgeUseCase.execute({
      knowledgeId: req.params.knowledgeId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.accepted(res, result, 'Indexing started');
  };

  search = async (req, res) => {
    const results = await this.slackAgentFacade.searchKnowledgeUseCase.execute({
      query: req.query.q,
      organizationId: req.user.organizationId || req.user.id,
      sourceType: req.query.sourceType,
      limit: req.query.limit || 10,
    });
    return ApiResponse.success(res, results);
  };

  delete = async (req, res) => {
    await this.slackAgentFacade.deleteKnowledgeUseCase.execute(req.params.knowledgeId);
    return ApiResponse.success(res, null, 'Knowledge deleted');
  };

  refresh = async (req, res) => {
    return ApiResponse.accepted(res, {}, 'Refresh started');
  };
}

module.exports = KnowledgeController;
