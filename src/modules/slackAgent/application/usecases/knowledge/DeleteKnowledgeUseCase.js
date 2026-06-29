'use strict';

class DeleteKnowledgeUseCase {
  constructor({ knowledgeRepository, auditService }) {
    this.knowledgeRepository = knowledgeRepository;
    this.auditService = auditService;
  }

  async execute(documentId) {
    await this.knowledgeRepository.delete(documentId);
    await this.auditService.log('knowledge.deleted', { documentId });
  }
}

module.exports = DeleteKnowledgeUseCase;
