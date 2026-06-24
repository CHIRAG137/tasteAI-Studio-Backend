'use strict';

const IQAKnowledgeProvisioningService = require('../../domain/services/IQAKnowledgeProvisioningService');

class QAKnowledgeProvisioningAdapter extends IQAKnowledgeProvisioningService {
  constructor({ qaTrainingService }) {
    super();

    this.qaTrainingService = qaTrainingService;
  }

  async train({ botId, files, urls }) {
    return this.qaTrainingService.trainBot({
      botId,
      files,
      urls,
    });
  }
}

module.exports = QAKnowledgeProvisioningAdapter;
