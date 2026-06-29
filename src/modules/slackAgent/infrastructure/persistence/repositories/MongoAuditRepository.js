'use strict';

const AuditLogModel = require('../models/AuditLogModel');

class MongoAuditRepository {
  async findById(id) {
    return AuditLogModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId, filters = {}) {
    const query = { organizationId, ...filters };
    return AuditLogModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findByActorId(actorId) {
    return AuditLogModel.find({ actorId }).sort({ createdAt: -1 }).lean();
  }

  async findByResource(resourceType, resourceId) {
    return AuditLogModel.find({ resourceType, resourceId }).sort({ createdAt: -1 }).lean();
  }

  async findByAction(action) {
    return AuditLogModel.find({ action }).sort({ createdAt: -1 }).lean();
  }

  async findAll(filters = {}) {
    return AuditLogModel.find(filters).sort({ createdAt: -1 }).lean();
  }

  async save(data) {
    return AuditLogModel.create(data);
  }

  async log(action, metadata = {}) {
    try {
      return await AuditLogModel.create({
        organizationId: metadata.organizationId,
        actorId: metadata.actorId || metadata.userId || metadata.createdById,
        actorType: metadata.actorType || 'system',
        action,
        resourceType: metadata.resourceType || action.split('.')[0] || 'unknown',
        resourceId:
          metadata.resourceId ||
          metadata.agentId ||
          metadata.webhookId ||
          metadata.ticketId ||
          metadata.serverId ||
          metadata.documentId ||
          metadata.workspaceId,
        metadata,
      });
    } catch (err) {
      console.error('Audit log failed:', err.message);
    }
  }

  async delete(id) {
    return AuditLogModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return AuditLogModel.countDocuments(filters);
  }
}

module.exports = MongoAuditRepository;
