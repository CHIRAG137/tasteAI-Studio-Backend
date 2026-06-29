'use strict';

class INotificationRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findByRecipientId(recipientId) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId) {
    throw new Error('Not implemented');
  }
  async findByChannelType(channelType) {
    throw new Error('Not implemented');
  }
  async findPending() {
    throw new Error('Not implemented');
  }
  async findFailed() {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(notification) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = INotificationRepository;
