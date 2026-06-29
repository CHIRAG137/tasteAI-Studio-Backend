'use strict';

class UpdateChatbotUseCase {
  constructor({ managementRepository, encryptionService }) {
    this.managementRepository = managementRepository;
    this.encryptionService = encryptionService;
  }

  async execute(command) {
    const bot = await this.managementRepository.findById(command.botId);

    if (!bot) {
      const error = new Error('Bot not found');
      error.statusCode = 404;
      throw error;
    }

    if (String(bot.user) !== String(command.userId)) {
      const error = new Error('Unauthorized to update this bot');
      error.statusCode = 403;
      throw error;
    }

    const updatePayload = command.toUpdatePayload(this.encryptionService);

    if (Object.keys(updatePayload).length === 0) {
      return bot;
    }

    const updated = await this.managementRepository.update(command.botId, updatePayload);

    return updated;
  }
}

module.exports = UpdateChatbotUseCase;
