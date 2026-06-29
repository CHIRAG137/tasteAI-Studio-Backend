'use strict';

const KnowledgeEdgeModel = require('../models/KnowledgeEdgeModel');
const IKnowledgeEdgeRepository = require('../../../domain/repositories/IKnowledgeEdgeRepository');

class MongoKnowledgeEdgeRepository extends IKnowledgeEdgeRepository {
  async findById(id) {
    return KnowledgeEdgeModel.findById(id).lean();
  }

  async findByOrganization(organizationId, filters = {}) {
    const query = { organizationId, ...filters };
    return KnowledgeEdgeModel.find(query).sort({ timestamp: -1 }).lean();
  }

  async findBySource(sourceNodeId, relationshipTypes = []) {
    const query = { sourceNodeId };
    if (relationshipTypes.length > 0) {
      query.relationshipType = { $in: relationshipTypes };
    }
    return KnowledgeEdgeModel.find(query).sort({ timestamp: -1 }).lean();
  }

  async findByTarget(targetNodeId, relationshipTypes = []) {
    const query = { targetNodeId };
    if (relationshipTypes.length > 0) {
      query.relationshipType = { $in: relationshipTypes };
    }
    return KnowledgeEdgeModel.find(query).sort({ timestamp: -1 }).lean();
  }

  async findPath(sourceNodeId, targetNodeId, maxDepth = 3) {
    return KnowledgeEdgeModel.aggregate([
      {
        $match: {
          $or: [{ sourceNodeId }, { targetNodeId }],
        },
      },
      {
        $graphLookup: {
          from: 'knowledgedges',
          startWith: '$sourceNodeId',
          connectFromField: 'targetNodeId',
          connectToField: 'sourceNodeId',
          as: 'path',
          maxDepth,
          depthField: 'depth',
        },
      },
      {
        $match: {
          $or: [
            { 'path.sourceNodeId': sourceNodeId, 'path.targetNodeId': targetNodeId },
            { 'path.sourceNodeId': targetNodeId, 'path.targetNodeId': sourceNodeId },
          ],
        },
      },
      { $limit: 10 },
    ]);
  }

  async findNeighbors(nodeId, relationshipTypes = [], direction = 'both') {
    const pipeline = [];
    const matchStage = {};

    if (direction === 'outgoing' || direction === 'both') {
      matchStage.sourceNodeId = nodeId;
    }
    if (direction === 'incoming' || direction === 'both') {
      matchStage.targetNodeId = nodeId;
    }
    if (relationshipTypes.length > 0) {
      matchStage.relationshipType = { $in: relationshipTypes };
    }

    pipeline.push({ $match: matchStage });

    if (direction === 'outgoing' || direction === 'both') {
      pipeline.push({
        $lookup: {
          from: 'knowledgenodes',
          localField: 'targetNodeId',
          foreignField: '_id',
          as: 'targetNode',
        },
      });
    }
    if (direction === 'incoming' || direction === 'both') {
      pipeline.push({
        $lookup: {
          from: 'knowledgenodes',
          localField: 'sourceNodeId',
          foreignField: '_id',
          as: 'sourceNode',
        },
      });
    }

    pipeline.push({ $limit: 100 });
    return KnowledgeEdgeModel.aggregate(pipeline);
  }

  async findEdgesBetween(sourceExternalId, targetExternalId, relationshipType) {
    const query = { sourceExternalId, targetExternalId };
    if (relationshipType) {
      query.relationshipType = relationshipType;
    }
    return KnowledgeEdgeModel.find(query).lean();
  }

  async save(data) {
    return KnowledgeEdgeModel.create(data);
  }

  async upsert(sourceExternalId, targetExternalId, relationshipType, data) {
    const filter = { sourceExternalId, targetExternalId, relationshipType };
    try {
      return await KnowledgeEdgeModel.findOneAndUpdate(filter, data, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }).lean();
    } catch (err) {
      if (err.code === 11000) {
        // E11000 duplicate key — race condition on upsert; retry as a simple update
        const existing = await KnowledgeEdgeModel.findOneAndUpdate(filter, data, {
          new: true,
        }).lean();
        if (existing) return existing;
      }
      throw err;
    }
  }

  async delete(id) {
    return KnowledgeEdgeModel.findByIdAndDelete(id);
  }

  async deleteByWorkspace(workspaceId) {
    return KnowledgeEdgeModel.deleteMany({ workspaceId });
  }

  async count(filters = {}) {
    return KnowledgeEdgeModel.countDocuments(filters);
  }

  async findByNodeIds(organizationId, workspaceId, nodeIds) {
    return KnowledgeEdgeModel.find({
      organizationId,
      workspaceId,
      $or: [{ sourceNodeId: { $in: nodeIds } }, { targetNodeId: { $in: nodeIds } }],
    })
      .sort({ weight: -1 })
      .limit(200)
      .lean();
  }
}

module.exports = MongoKnowledgeEdgeRepository;
