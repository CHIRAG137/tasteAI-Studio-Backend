'use strict';

class IKnowledgeEdgeRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }

  async findByOrganization(organizationId, filters = {}) {
    throw new Error('Not implemented');
  }

  async findBySource(sourceNodeId, relationshipTypes) {
    throw new Error('Not implemented');
  }

  async findByTarget(targetNodeId, relationshipTypes) {
    throw new Error('Not implemented');
  }

  async findPath(sourceNodeId, targetNodeId, maxDepth) {
    throw new Error('Not implemented');
  }

  async findNeighbors(nodeId, relationshipTypes, direction) {
    throw new Error('Not implemented');
  }

  async findEdgesBetween(sourceExternalId, targetExternalId, relationshipType) {
    throw new Error('Not implemented');
  }

  async save(data) {
    throw new Error('Not implemented');
  }

  async upsert(sourceExternalId, targetExternalId, relationshipType, data) {
    throw new Error('Not implemented');
  }

  async delete(id) {
    throw new Error('Not implemented');
  }

  async deleteByWorkspace(workspaceId) {
    throw new Error('Not implemented');
  }

  async count(filters = {}) {
    throw new Error('Not implemented');
  }

  async findByNodeIds(organizationId, workspaceId, nodeIds) {
    throw new Error('Not implemented');
  }
}

module.exports = IKnowledgeEdgeRepository;
