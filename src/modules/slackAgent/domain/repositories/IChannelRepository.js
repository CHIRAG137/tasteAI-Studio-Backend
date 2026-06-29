'use strict';

class IChannelRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findByChannelId(workspaceId, channelId) {
    throw new Error('Not implemented');
  }
  async findByWorkspaceId(workspaceId) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId) {
    throw new Error('Not implemented');
  }
  async findMonitored(organizationId) {
    throw new Error('Not implemented');
  }
  async search(query) {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(channel) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async delete(id) {
    throw new Error('Not implemented');
  }
  async bulkSave(channels) {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = IChannelRepository;
