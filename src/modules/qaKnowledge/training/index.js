'use strict';

const TrainKnowledgeBaseUseCase = require('./application/TrainKnowledgeBaseUseCase');
const QAContentProcessingAdapter = require('./infrastructure/QAContentProcessingAdapter');

const QAHistoryModel = require('../../../../models/QAHistory');
const SpreadsheetConfigModel = require('../../../../models/SpreadsheetConfig');

const logger = require('../../shared/logging');

function createQAKnowledgeTrainingModule() {
  const contentProcessor = new QAContentProcessingAdapter({
    QAHistoryModel,
    SpreadsheetConfigModel,
    logger,
  });

  const trainKnowledgeBaseUseCase = new TrainKnowledgeBaseUseCase({
    contentProcessor,
    logger,
  });

  return {
    trainKnowledgeBaseUseCase,
  };
}

module.exports = {
  createQAKnowledgeTrainingModule,
};
