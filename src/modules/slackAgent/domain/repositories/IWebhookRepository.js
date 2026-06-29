'use strict';

class IWebhookRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId) {
    throw new Error('Not implemented');
  }
  async findByType(type) {
    throw new Error('Not implemented');
  }
  async findByEvent(event) {
    throw new Error('Not implemented');
  }
  async findActive(organizationId) {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(webhook) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async delete(id) {
    throw new Error('Not implemented');
  }
  async addToDeadLetter(webhookId, entry) {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = IWebhookRepository;
