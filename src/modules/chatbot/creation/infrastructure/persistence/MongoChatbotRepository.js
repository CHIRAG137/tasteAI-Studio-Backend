'use strict';

const Chatbot = require('../../domain/entities/Chatbot');

const IChatbotRepository = require('../../domain/repositories/IChatbotRepository');

class MongoChatbotRepository extends IChatbotRepository {
  constructor({ ChatBotModel }) {
    super();

    this.ChatBotModel = ChatBotModel;
  }

  async create(chatbot) {
    const created = await this.ChatBotModel.create(chatbot.toPersistence());

    return created;
  }

  async findById(id) {
    const document = await this.ChatBotModel.findById(id);

    if (!document) {
      return null;
    }

    return Chatbot.fromPersistence(document);
  }

  async update(id, payload) {
    const updated = await this.ChatBotModel.findByIdAndUpdate(id, payload, {
      new: true,
    });

    if (!updated) {
      return null;
    }

    return Chatbot.fromPersistence(updated);
  }
}

module.exports = MongoChatbotRepository;
