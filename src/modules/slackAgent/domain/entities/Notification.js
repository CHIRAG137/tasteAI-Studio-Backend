'use strict';

class Notification {
  constructor({
    id,
    organizationId,
    channelType,
    recipientId,
    recipientType,
    title,
    body,
    templateId,
    templateData,
    status,
    sentAt,
    readAt,
    error,
    retryCount,
    metadata,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.channelType = channelType;
    this.recipientId = recipientId;
    this.recipientType = recipientType;
    this.title = title;
    this.body = body;
    this.templateId = templateId;
    this.templateData = templateData || {};
    this.status = status || 'pending';
    this.sentAt = sentAt;
    this.readAt = readAt;
    this.error = error;
    this.retryCount = retryCount || 0;
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.channelType) {
      throw new Error('Channel type is required');
    }
    if (!this.recipientId) {
      throw new Error('Recipient id is required');
    }
    if (!this.body) {
      throw new Error('Notification body is required');
    }
  }
}

module.exports = Notification;
