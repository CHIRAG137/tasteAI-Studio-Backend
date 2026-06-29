'use strict';

class SearchKnowledgeGraphUseCase {
  constructor({ knowledgeGraphService }) {
    this.knowledgeGraphService = knowledgeGraphService;
  }

  async execute(command) {
    const {
      organizationId,
      workspaceId,
      query,
      searchType,
      nodeId,
      depth,
      userSlackIdA,
      userSlackIdB,
      entityType,
      intent,
    } = command;

    switch (searchType) {
      case 'text':
        return this.knowledgeGraphService.searchText(organizationId, workspaceId, query);

      case 'llm':
        return this.knowledgeGraphService.searchWithLLM(organizationId, workspaceId, query);

      case 'mentions':
        return this.knowledgeGraphService.findMessagesMentioningUser(
          organizationId,
          workspaceId,
          userSlackIdA,
        );

      case 'between_users':
        return this.knowledgeGraphService.findMessagesBetweenUsers(
          organizationId,
          workspaceId,
          userSlackIdA,
          userSlackIdB,
        );

      case 'subgraph':
        return this.knowledgeGraphService.getSubgraph(nodeId, depth || 2);

      case 'path':
        return this.knowledgeGraphService.findPathBetweenUsers(
          organizationId,
          workspaceId,
          userSlackIdA,
          userSlackIdB,
        );

      case 'stats':
        return this.knowledgeGraphService.getGraphStats(organizationId, workspaceId);

      case 'entity':
        return this.knowledgeGraphService.searchByEntityType(
          organizationId,
          workspaceId,
          entityType,
        );

      case 'intent':
        return this.knowledgeGraphService.searchByIntent(organizationId, workspaceId, intent);

      default:
        return this.knowledgeGraphService.searchText(organizationId, workspaceId, query);
    }
  }
}

module.exports = SearchKnowledgeGraphUseCase;
