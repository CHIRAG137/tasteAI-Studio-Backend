'use strict';

class SendNotificationCommand {
  constructor({
    organizationId,
    channelType,
    recipientId,
    recipientType,
    title,
    body,
    templateId,
    templateData,
  }) {
    this.organizationId = organizationId;
    this.channelType = channelType;
    this.recipientId = recipientId;
    this.recipientType = recipientType;
    this.title = title;
    this.body = body;
    this.templateId = templateId;
    this.templateData = templateData;
    this.validate();
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
      throw new Error('Body is required');
    }
  }
}

class SendBulkNotificationCommand {
  constructor({ organizationId, channelType, recipientIds, recipientType, title, body }) {
    this.organizationId = organizationId;
    this.channelType = channelType;
    this.recipientIds = recipientIds;
    this.recipientType = recipientType;
    this.title = title;
    this.body = body;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.channelType) {
      throw new Error('Channel type is required');
    }
    if (!this.recipientIds || !this.recipientIds.length) {
      throw new Error('At least one recipient id is required');
    }
    if (!this.body) {
      throw new Error('Body is required');
    }
  }
}

module.exports = { SendNotificationCommand, SendBulkNotificationCommand };
