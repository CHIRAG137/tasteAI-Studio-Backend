'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class KnowledgeGraphController {
  constructor({ slackAgentFacade }) {
    this.facade = slackAgentFacade;
  }

  searchText = async (req, res) => {
    const { query } = req.query;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    if (!query) {
      return ApiResponse.badRequest(res, null, 'Search query is required');
    }

    const results = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      query,
      searchType: 'text',
    });

    return ApiResponse.success(res, { results });
  };

  searchWithLLM = async (req, res) => {
    const { question } = req.body;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    if (!question) {
      return ApiResponse.badRequest(res, null, 'Question is required');
    }

    const result = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      query: question,
      searchType: 'llm',
    });

    return ApiResponse.success(res, result);
  };

  findMentions = async (req, res) => {
    const { userSlackId } = req.query;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    if (!userSlackId) {
      return ApiResponse.badRequest(res, null, 'userSlackId is required');
    }

    const results = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      userSlackIdA: userSlackId,
      searchType: 'mentions',
    });

    return ApiResponse.success(res, { results });
  };

  findMessagesBetweenUsers = async (req, res) => {
    const { userA, userB } = req.query;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    if (!userA || !userB) {
      return ApiResponse.badRequest(res, null, 'Both userA and userB query params are required');
    }

    const results = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      userSlackIdA: userA,
      userSlackIdB: userB,
      searchType: 'between_users',
    });

    return ApiResponse.success(res, { results });
  };

  getSubgraph = async (req, res) => {
    const { nodeId } = req.params;
    const { depth } = req.query;

    if (!nodeId) {
      return ApiResponse.badRequest(res, null, 'nodeId is required');
    }

    const result = await this.facade.searchKnowledgeGraphUseCase.execute({
      nodeId,
      depth: parseInt(depth, 10) || 2,
      searchType: 'subgraph',
    });

    return ApiResponse.success(res, result);
  };

  findPath = async (req, res) => {
    const { userA, userB } = req.query;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    if (!userA || !userB) {
      return ApiResponse.error(res, 'Both userA and userB query params are required', 400);
    }

    const result = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      userSlackIdA: userA,
      userSlackIdB: userB,
      searchType: 'path',
    });

    return ApiResponse.success(res, result);
  };

  getStats = async (req, res) => {
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    const stats = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      searchType: 'stats',
    });

    return ApiResponse.success(res, stats);
  };

  // ── New: Entity-specific endpoints ──

  searchByEntityType = async (req, res) => {
    const { entityType } = req.params;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    const results = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      searchType: 'entity',
      entityType,
    });

    return ApiResponse.success(res, { results });
  };

  searchByIntent = async (req, res) => {
    const { intent } = req.params;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;

    const results = await this.facade.searchKnowledgeGraphUseCase.execute({
      organizationId,
      workspaceId,
      searchType: 'intent',
      intent,
    });

    return ApiResponse.success(res, { results });
  };

  getEntityGraph = async (req, res) => {
    const { entityType } = req.params;
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;
    const { limit } = req.query;

    const result = await this.facade.knowledgeGraphService.getEntityGraph(
      organizationId,
      workspaceId,
      entityType,
      parseInt(limit, 10) || 50,
    );

    return ApiResponse.success(res, result);
  };

  getFullGraph = async (req, res) => {
    const { organizationId } = req.user || {};
    const { workspaceId } = req.params;
    const { limit } = req.query;

    const result = await this.facade.knowledgeGraphService.getFullGraph(
      organizationId,
      workspaceId,
      parseInt(limit, 10) || 100,
    );

    return ApiResponse.success(res, result);
  };

  getNodeTypes = async (req, res) => {
    const NODE_TYPES = [
      'person',
      'team',
      'department',
      'role',
      'technology',
      'programming_language',
      'framework',
      'library',
      'api',
      'database',
      'repository',
      'service',
      'microservice',
      'endpoint',
      'project',
      'product',
      'feature',
      'company',
      'topic',
      'concept',
      'documentation',
      'meeting',
      'architecture',
      'design_pattern',
      'decision',
      'proposal',
      'question',
      'task',
      'action_item',
      'issue',
      'bug',
      'incident',
      'pull_request',
      'deployment',
      'release',
      'version',
      'sprint',
      'milestone',
      'date',
      'deadline',
    ];

    return ApiResponse.success(res, { nodeTypes: NODE_TYPES });
  };
}

module.exports = KnowledgeGraphController;
