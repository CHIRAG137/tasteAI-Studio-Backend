'use strict';

class AuditLog {
  constructor({ id, organizationId, actorId, actorType, action, resourceType, resourceId, targetId, targetType, changes, metadata, ipAddress, userAgent, sessionId, correlationId, timestamp, createdAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.actorId = actorId;
    this.actorType = actorType;
    this.action = action;
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.targetId = targetId;
    this.targetType = targetType;
    this.changes = changes || {};
    this.metadata = metadata || {};
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.sessionId = sessionId;
    this.correlationId = correlationId;
    this.timestamp = timestamp || new Date();
    this.createdAt = createdAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.actorId) throw new Error('Actor id is required');
    if (!this.action) throw new Error('Action is required');
    if (!this.resourceType) throw new Error('Resource type is required');
    if (!this.resourceId) throw new Error('Resource id is required');
  }
}

module.exports = AuditLog;
