'use strict';

class CustomizationRepository {
  constructor({ CustomizationModel }) {
    this.CustomizationModel = CustomizationModel;
  }

  async create(payload) {
    return this.CustomizationModel.create(payload);
  }

  async findByBotId(botId) {
    return this.CustomizationModel.findOne({
      botId,
    });
  }

  async updateByBotId(botId, payload) {
    return this.CustomizationModel.findOneAndUpdate({ botId }, payload, {
      new: true,
    });
  }
}

module.exports = CustomizationRepository;
