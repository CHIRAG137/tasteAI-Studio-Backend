'use strict';

class CreateWebhookCommand {
  constructor({ organizationId, name, type, url, secret, events, headers, retryConfig, createdById }) {
    this.organizationId = organizationId;
    this.name = name;
    this.type = type;
    this.url = url;
    this.secret = secret;
    this.events = events;
    this.headers = headers;
    this.retryConfig = retryConfig;
    this.createdById = createdById;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Webhook name is required');
    if (!this.url) throw new Error('Webhook URL is required');
    if (!this.type) throw new Error('Webhook type is required');
  }
}

class TriggerWebhookCommand {
  constructor({ webhookId, payload, organizationId }) {
    this.webhookId = webhookId;
    this.payload = payload;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.webhookId) throw new Error('Webhook id is required');
    if (!this.payload) throw new Error('Payload is required');
  }
}

class RetryWebhookCommand {
  constructor({ webhookId, deadLetterEntryId, organizationId }) {
    this.webhookId = webhookId;
    this.deadLetterEntryId = deadLetterEntryId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.webhookId) throw new Error('Webhook id is required');
  }
}

module.exports = { CreateWebhookCommand, TriggerWebhookCommand, RetryWebhookCommand };
