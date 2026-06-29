'use strict';

class IRoutingRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId) {
    throw new Error('Not implemented');
  }
  async findActive(organizationId) {
    throw new Error('Not implemented');
  }
  async findByTargetType(targetType) {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(rule) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async delete(id) {
    throw new Error('Not implemented');
  }
  async reorder(ruleIds) {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = IRoutingRepository;
