'use strict';

const TrainKnowledgeBaseUseCase = require('./application/TrainKnowledgeBaseUseCase');

const QAHistoryModel = require('../models/QAHistory');

const QAHistoryRepository = require('../repositories/QAHistoryRepository');

function createQAKnowledgeTrainingModule() {
  const qaHistoryRepository = new QAHistoryRepository({
    QAHistoryModel,
  });

  const trainKnowledgeBaseUseCase = new TrainKnowledgeBaseUseCase({
    qaHistoryRepository,
  });

  return {
    trainKnowledgeBaseUseCase,
  };
}

module.exports = {
  createQAKnowledgeTrainingModule,
};
