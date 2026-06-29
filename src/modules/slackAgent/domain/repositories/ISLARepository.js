'use strict';

class ISLARepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId) {
    throw new Error('Not implemented');
  }
  async findByPriority(organizationId, priority) {
    throw new Error('Not implemented');
  }
  async findActive(organizationId) {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(sla) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async delete(id) {
    throw new Error('Not implemented');
  }
  async createTimer(timer) {
    throw new Error('Not implemented');
  }
  async updateTimer(id, data) {
    throw new Error('Not implemented');
  }
  async findActiveTimers() {
    throw new Error('Not implemented');
  }
  async findBreachedTimers() {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = ISLARepository;
