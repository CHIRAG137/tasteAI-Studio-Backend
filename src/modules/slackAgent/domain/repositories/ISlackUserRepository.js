'use strict';

class ISlackUserRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findBySlackUserId(workspaceId, slackUserId) {
    throw new Error('Not implemented');
  }
  async findByWorkspaceId(workspaceId) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId) {
    throw new Error('Not implemented');
  }
  async search(query) {
    throw new Error('Not implemented');
  }
  async findByEmail(workspaceId, email) {
    throw new Error('Not implemented');
  }
  async findUserGroups(workspaceId) {
    throw new Error('Not implemented');
  }
  async findTeams(workspaceId) {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(user) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async bulkSave(users) {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = ISlackUserRepository;
