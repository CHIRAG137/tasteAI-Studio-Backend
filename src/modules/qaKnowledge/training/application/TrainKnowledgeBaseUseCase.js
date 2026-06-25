'use strict';

class TrainKnowledgeBaseUseCase {
  constructor({ qaHistoryRepository }) {
    this.qaHistoryRepository = qaHistoryRepository;
  }

  async execute({ botId, files }) {
    /*
     training logic later
    */

    return true;
  }
}

module.exports = TrainKnowledgeBaseUseCase;
