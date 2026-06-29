'use strict';

const ICustomizationRepository = require('../../domain/repositories/ICustomizationRepository');
const Customization = require('../../domain/entities/Customization');

class MongoCustomizationRepository extends ICustomizationRepository {
  constructor({ CustomizationModel }) {
    super();
    this.CustomizationModel = CustomizationModel;
  }

  async findByBotId(botId) {
    const doc = await this.CustomizationModel.findOne({ botId }).lean();
    return Customization.fromPersistence(doc);
  }

  async upsert(botId, payload) {
    const doc = await this.CustomizationModel.findOneAndUpdate(
      { botId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return Customization.fromPersistence(doc);
  }
}

module.exports = MongoCustomizationRepository;
