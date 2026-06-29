'use strict';

class IAgentRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId) {
    throw new Error('Not implemented');
  }
  async findByChannelId(channelId) {
    throw new Error('Not implemented');
  }
  async findEnabled(organizationId) {
    throw new Error('Not implemented');
  }
  async search(query) {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(agent) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async delete(id) {
    throw new Error('Not implemented');
  }
  async clone(id, overrides) {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = IAgentRepository;
