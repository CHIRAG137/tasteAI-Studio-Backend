'use strict';

class IClassificationRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByTicketId(ticketId) { throw new Error('Not implemented'); }
  async findByOrganizationId(organizationId) { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async save(classification) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async count(filters) { throw new Error('Not implemented'); }
}

module.exports = IClassificationRepository;
