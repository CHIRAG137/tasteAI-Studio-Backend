'use strict';

class IChatbotRepository {
  async create(chatbot) {
    throw new Error('IChatbotRepository.create not implemented');
  }

  async findById(id) {
    throw new Error('IChatbotRepository.findById not implemented');
  }

  async update(id, data) {
    throw new Error('IChatbotRepository.update not implemented');
  }
}

module.exports = IChatbotRepository;
