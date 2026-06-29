'use strict';

class IndexKnowledgeUseCase {
  constructor({ knowledgeRepository, indexingService }) {
    this.knowledgeRepository = knowledgeRepository;
    this.indexingService = indexingService;
  }

  async execute(command) {
    const document = await this.knowledgeRepository.findById(command.documentId);
    return this.indexingService.index(document);
  }
}

module.exports = IndexKnowledgeUseCase;
