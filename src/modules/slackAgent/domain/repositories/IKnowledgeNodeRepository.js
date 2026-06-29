'use strict';

class IKnowledgeNodeRepository {
  async findById(id) { throw new Error('Not implemented'); }

  async findByExternalId(organizationId, workspaceId, externalId, nodeType) {
    throw new Error('Not implemented');
  }

  async findByOrganization(organizationId, filters = {}) {
    throw new Error('Not implemented');
  }

  async findByWorkspace(workspaceId, filters = {}) {
    throw new Error('Not implemented');
  }

  async findUsers(organizationId, workspaceId) {
    throw new Error('Not implemented');
  }

  async findMessages(organizationId, workspaceId, filters = {}) {
    throw new Error('Not implemented');
  }

  async findMessagesByUser(organizationId, workspaceId, userSlackId) {
    throw new Error('Not implemented');
  }

  async searchText(organizationId, workspaceId, query) {
    throw new Error('Not implemented');
  }

  async findConnected(sourceNodeId, relationshipTypes, depth) {
    throw new Error('Not implemented');
  }

  async findNodesByMentions(organizationId, workspaceId, mentionedUserIds) {
    throw new Error('Not implemented');
  }

  async findMessagesBetweenUsers(organizationId, workspaceId, userSlackIdA, userSlackIdB) {
    throw new Error('Not implemented');
  }

  async save(data) { throw new Error('Not implemented'); }

  async upsertByExternalId(organizationId, workspaceId, externalId, nodeType, data) {
    throw new Error('Not implemented');
  }

  async delete(id) { throw new Error('Not implemented'); }

  async deleteByWorkspace(workspaceId) { throw new Error('Not implemented'); }

  async count(filters = {}) { throw new Error('Not implemented'); }

  async findByNodeType(organizationId, workspaceId, nodeType, limit = 50) {
    throw new Error('Not implemented');
  }

  async findByIntent(organizationId, workspaceId, intent) {
    throw new Error('Not implemented');
  }
}

module.exports = IKnowledgeNodeRepository;
