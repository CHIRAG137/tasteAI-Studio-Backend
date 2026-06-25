'use strict';

class QAHistoryRepository {
  constructor({ QAHistoryModel }) {
    this.QAHistoryModel = QAHistoryModel;
  }

  async bulkCreate(records) {
    return this.QAHistoryModel.insertMany(records);
  }

  async findByBotId(botId) {
    return this.QAHistoryModel.find({
      bot: botId,
    });
  }

  async deleteByBotId(botId) {
    return this.QAHistoryModel.deleteMany({
      bot: botId,
    });
  }
}

module.exports = QAHistoryRepository;
