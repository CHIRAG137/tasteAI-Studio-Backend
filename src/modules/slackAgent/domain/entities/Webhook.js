'use strict';

class Webhook {
  constructor({
    id,
    organizationId,
    name,
    type,
    url,
    secret,
    events,
    headers,
    retryConfig,
    isActive,
    lastTriggeredAt,
    lastResponse,
    deadLetterQueue,
    failureCount,
    successCount,
    metadata,
    createdById,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.type = type;
    this.url = url;
    this.secret = secret;
    this.events = events || [];
    this.headers = headers || {};
    this.retryConfig = retryConfig || {};
    this.isActive = isActive !== undefined ? isActive : true;
    this.lastTriggeredAt = lastTriggeredAt;
    this.lastResponse = lastResponse;
    this.deadLetterQueue = deadLetterQueue || [];
    this.failureCount = failureCount || 0;
    this.successCount = successCount || 0;
    this.metadata = metadata || {};
    this.createdById = createdById;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.name || !this.name.trim()) {
      throw new Error('Webhook name is required');
    }
    if (!this.url) {
      throw new Error('Webhook URL is required');
    }
    if (!this.type) {
      throw new Error('Webhook type is required');
    }
  }
}

module.exports = Webhook;
