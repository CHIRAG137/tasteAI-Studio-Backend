'use strict';

class IEmbeddingService {
  async generateEmbedding(text) { throw new Error('Not implemented'); }
  async generateEmbeddings(texts) { throw new Error('Not implemented'); }
  async searchSimilar(embedding, indexName, limit) { throw new Error('Not implemented'); }
  async indexDocument(id, text, metadata) { throw new Error('Not implemented'); }
  async indexDocuments(documents) { throw new Error('Not implemented'); }
  async deleteIndex(id) { throw new Error('Not implemented'); }
  async deleteIndexByFilter(filter) { throw new Error('Not implemented'); }
}

module.exports = IEmbeddingService;
