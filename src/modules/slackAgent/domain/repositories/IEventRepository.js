'use strict';

class IEventRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByEventId(eventId) { throw new Error('Not implemented'); }
  async findByOrganizationId(organizationId) { throw new Error('Not implemented'); }
  async findByType(eventType) { throw new Error('Not implemented'); }
  async findUnprocessed() { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async save(event) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async count(filters) { throw new Error('Not implemented'); }
}

module.exports = IEventRepository;
