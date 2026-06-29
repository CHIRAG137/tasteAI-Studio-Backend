'use strict';

class SearchKnowledgeUseCase {
  constructor({ knowledgeRepository }) {
    this.knowledgeRepository = knowledgeRepository;
  }

  async execute(query) {
    return this.knowledgeRepository.search(query);
  }
}

module.exports = SearchKnowledgeUseCase;
