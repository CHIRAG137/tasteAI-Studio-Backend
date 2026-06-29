'use strict';

class IEscalationRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByOrganizationId(organizationId) { throw new Error('Not implemented'); }
  async findByTrigger(trigger) { throw new Error('Not implemented'); }
  async findActive(organizationId) { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async save(escalation) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async count(filters) { throw new Error('Not implemented'); }
}

module.exports = IEscalationRepository;
