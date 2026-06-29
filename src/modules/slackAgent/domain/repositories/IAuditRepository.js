'use strict';

class IAuditRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByOrganizationId(organizationId, filters) { throw new Error('Not implemented'); }
  async findByActorId(actorId) { throw new Error('Not implemented'); }
  async findByResourceType(resourceType, resourceId) { throw new Error('Not implemented'); }
  async findByAction(action) { throw new Error('Not implemented'); }
  async search(query) { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async save(auditLog) { throw new Error('Not implemented'); }
  async bulkSave(logs) { throw new Error('Not implemented'); }
  async count(filters) { throw new Error('Not implemented'); }
}

module.exports = IAuditRepository;
