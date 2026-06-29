'use strict';

class UploadKnowledgeUseCase {
  constructor({ knowledgeRepository, auditService }) {
    this.knowledgeRepository = knowledgeRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const document = await this.knowledgeRepository.save(command);
    await this.auditService.log('knowledge.uploaded', {
      documentId: document.id,
      organizationId: command.organizationId,
    });
    return document;
  }
}

module.exports = UploadKnowledgeUseCase;
