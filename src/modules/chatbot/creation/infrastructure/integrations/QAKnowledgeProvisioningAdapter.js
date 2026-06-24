'use strict';

const IQAKnowledgeProvisioningService = require('../../domain/services/IQAKnowledgeProvisioningService');

class QAKnowledgeProvisioningAdapter extends IQAKnowledgeProvisioningService {
  constructor({ trainKnowledgeBaseUseCase }) {
    super();

    this.trainKnowledgeBaseUseCase = trainKnowledgeBaseUseCase;
  }

  async train({ botId, files, urls }) {
    return this.trainKnowledgeBaseUseCase.execute({
      botId,
      files,
      urls,
    });
  }
}

module.exports = QAKnowledgeProvisioningAdapter;
