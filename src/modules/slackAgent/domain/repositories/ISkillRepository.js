'use strict';

class ISkillRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByOrganizationId(organizationId) { throw new Error('Not implemented'); }
  async findByType(type) { throw new Error('Not implemented'); }
  async findEnabled(organizationId) { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async save(skill) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async count(filters) { throw new Error('Not implemented'); }
}

module.exports = ISkillRepository;
