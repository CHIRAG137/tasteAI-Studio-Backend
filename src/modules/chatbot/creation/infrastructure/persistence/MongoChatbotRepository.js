'use strict';

const IChatbotRepository = require('../../domain/repositories/IChatbotRepository');

class MongoChatbotRepository extends IChatbotRepository {
  constructor({ ChatBotModel }) {
    super();

    this.ChatBotModel = ChatBotModel;
  }

  async create(chatbot) {
    const document = await this.ChatBotModel.create(chatbot.toPersistence());

    return document;
  }

  async findById(id) {
    return this.ChatBotModel.findById(id);
  }

  async update(id, payload) {
    return this.ChatBotModel.findByIdAndUpdate(id, payload, {
      new: true,
    });
  }
}

module.exports = MongoChatbotRepository;
