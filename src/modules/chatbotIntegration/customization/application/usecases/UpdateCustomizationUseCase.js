'use strict';

class UpdateCustomizationUseCase {
  constructor({ customizationRepository, botQuery }) {
    this.customizationRepository = customizationRepository;
    this.botQuery = botQuery;
  }

  async execute(command) {
    const bot = await this.botQuery.findById(command.botId);
    if (!bot) {
      const error = new Error('Bot not found');
      error.statusCode = 404;
      throw error;
    }

    if (String(bot.user) !== String(command.userId)) {
      const error = new Error('Unauthorized to update customization for this bot');
      error.statusCode = 403;
      throw error;
    }

    const updatePayload = command.toUpdatePayload();
    const updated = await this.customizationRepository.upsert(command.botId, updatePayload);

    return updated;
  }
}

module.exports = UpdateCustomizationUseCase;
