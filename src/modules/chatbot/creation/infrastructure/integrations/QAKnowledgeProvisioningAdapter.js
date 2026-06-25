'use strict';

class QAKnowledgeProvisioningAdapter {
  constructor({ trainKnowledgeBaseUseCase }) {
    this.trainKnowledgeBaseUseCase = trainKnowledgeBaseUseCase;
  }

  async train({ botId, scrapedContent, files }) {
    return this.trainKnowledgeBaseUseCase.execute({
      botId,
      scrapedContent,
      files,
    });
  }
}

module.exports = QAKnowledgeProvisioningAdapter;
