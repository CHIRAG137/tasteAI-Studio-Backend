'use strict';

class IKnowledgeRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByOrganizationId(organizationId) { throw new Error('Not implemented'); }
  async findBySourceType(sourceType) { throw new Error('Not implemented'); }
  async search(query) { throw new Error('Not implemented'); }
  async searchVector(embedding, limit) { throw new Error('Not implemented'); }
  async findActive(organizationId) { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async save(knowledge) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async count(filters) { throw new Error('Not implemented'); }
}

module.exports = IKnowledgeRepository;
