'use strict';

class DeleteChatbotUseCase {
  constructor({ managementRepository }) {
    this.managementRepository = managementRepository;
  }

  async execute(command) {
    const bot = await this.managementRepository.findById(command.botId);

    if (!bot) {
      const error = new Error('Bot not found');
      error.statusCode = 404;
      throw error;
    }

    if (String(bot.user) !== String(command.userId)) {
      const error = new Error('Unauthorized to delete this bot');
      error.statusCode = 403;
      throw error;
    }

    await this.managementRepository.delete(command.botId);
  }
}

module.exports = DeleteChatbotUseCase;
