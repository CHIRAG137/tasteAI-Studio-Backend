'use strict';

const KnowledgeNodeModel = require('../models/KnowledgeNodeModel');
const IKnowledgeNodeRepository = require('../../../domain/repositories/IKnowledgeNodeRepository');

class MongoKnowledgeNodeRepository extends IKnowledgeNodeRepository {
  async findById(id) {
    return KnowledgeNodeModel.findById(id).lean();
  }

  async findByExternalId(organizationId, workspaceId, externalId, nodeType) {
    return KnowledgeNodeModel.findOne({ organizationId, workspaceId, externalId, nodeType }).lean();
  }

  async findByOrganization(organizationId, filters = {}) {
    const query = { organizationId, ...filters };
    return KnowledgeNodeModel.find(query).sort({ timestamp: -1 }).lean();
  }

  async findByWorkspace(workspaceId, filters = {}) {
    const query = { workspaceId, ...filters };
    return KnowledgeNodeModel.find(query).sort({ timestamp: -1 }).lean();
  }

  async findUsers(organizationId, workspaceId) {
    return KnowledgeNodeModel.find({ organizationId, workspaceId, nodeType: 'user' }).lean();
  }

  async findMessages(organizationId, workspaceId, filters = {}) {
    const query = { organizationId, workspaceId, nodeType: 'message', ...filters };
    return KnowledgeNodeModel.find(query).sort({ timestamp: -1 }).limit(100).lean();
  }

  async findMessagesByUser(organizationId, workspaceId, userSlackId) {
    return KnowledgeNodeModel.find({
      organizationId,
      workspaceId,
      nodeType: 'message',
      userSlackId,
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
  }

  async searchText(organizationId, workspaceId, query) {
    return KnowledgeNodeModel.find(
      {
        organizationId,
        workspaceId,
        $text: { $search: query },
      },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean();
  }

  async findConnected(sourceNodeId, relationshipTypes, depth = 1) {
    const result = await KnowledgeNodeModel.aggregate([
      {
        $match: { _id: sourceNodeId },
      },
      {
        $graphLookup: {
          from: 'knowledgedges',
          startWith: '$_id',
          connectFromField: 'targetNodeId',
          connectToField: 'sourceNodeId',
          as: 'outgoingEdges',
          maxDepth: depth,
          depthField: 'graphDepth',
          restrictSearchWithMatch: {
            relationshipType: { $in: relationshipTypes },
          },
        },
      },
      {
        $graphLookup: {
          from: 'knowledgedges',
          startWith: '$_id',
          connectFromField: 'sourceNodeId',
          connectToField: 'targetNodeId',
          as: 'incomingEdges',
          maxDepth: depth,
          depthField: 'graphDepth',
          restrictSearchWithMatch: {
            relationshipType: { $in: relationshipTypes },
          },
        },
      },
      {
        $project: {
          _id: 1,
          nodeType: 1,
          label: 1,
          text: 1,
          properties: 1,
          externalId: 1,
          timestamp: 1,
          outgoingEdges: {
            $map: {
              input: '$outgoingEdges',
              as: 'edge',
              in: {
                nodeId: '$$edge.targetNodeId',
                relationshipType: '$$edge.relationshipType',
                depth: '$$edge.graphDepth',
              },
            },
          },
          incomingEdges: {
            $map: {
              input: '$incomingEdges',
              as: 'edge',
              in: {
                nodeId: '$$edge.sourceNodeId',
                relationshipType: '$$edge.relationshipType',
                depth: '$$edge.graphDepth',
              },
            },
          },
        },
      },
    ]);
    return result[0] || null;
  }

  async findNodesByMentions(organizationId, workspaceId, mentionedUserIds) {
    return KnowledgeNodeModel.find({
      organizationId,
      workspaceId,
      nodeType: 'user',
      externalId: { $in: mentionedUserIds },
    }).lean();
  }

  async findMessagesBetweenUsers(organizationId, workspaceId, userSlackIdA, userSlackIdB) {
    return KnowledgeNodeModel.find({
      organizationId,
      workspaceId,
      nodeType: 'message',
      mentionUserIds: userSlackIdB,
      userSlackId: userSlackIdA,
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
  }

  async save(data) {
    return KnowledgeNodeModel.create(data);
  }

  async upsertByExternalId(organizationId, workspaceId, externalId, nodeType, data) {
    const filter = { organizationId, workspaceId, externalId, nodeType };
    return KnowledgeNodeModel.findOneAndUpdate(filter, data, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();
  }

  async delete(id) {
    return KnowledgeNodeModel.findByIdAndDelete(id);
  }

  async deleteByWorkspace(workspaceId) {
    return KnowledgeNodeModel.deleteMany({ workspaceId });
  }

  async count(filters = {}) {
    return KnowledgeNodeModel.countDocuments(filters);
  }

  async findByNodeType(organizationId, workspaceId, nodeType, limit = 50) {
    return KnowledgeNodeModel.find({ organizationId, workspaceId, nodeType })
      .sort({ importanceScore: -1, timestamp: -1 })
      .limit(limit)
      .lean();
  }

  async findByIntent(organizationId, workspaceId, intent) {
    return KnowledgeNodeModel.find({ organizationId, workspaceId, nodeType: 'message', intent })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
  }
}

module.exports = MongoKnowledgeNodeRepository;
