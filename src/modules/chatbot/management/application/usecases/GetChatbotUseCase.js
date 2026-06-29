'use strict';

class GetChatbotUseCase {
  constructor({ managementRepository }) {
    this.managementRepository = managementRepository;
  }

  async execute(query) {
    const bot = await this.managementRepository.findById(query.botId);

    if (!bot) {
      const error = new Error('Bot not found');
      error.statusCode = 404;
      throw error;
    }

    return bot;
  }
}

module.exports = GetChatbotUseCase;
