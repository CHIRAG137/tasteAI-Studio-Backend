'use strict';

class GetCustomizationUseCase {
  constructor({ customizationRepository, botQuery }) {
    this.customizationRepository = customizationRepository;
    this.botQuery = botQuery;
  }

  async execute(query) {
    const bot = await this.botQuery.findById(query.botId);
    if (!bot) {
      const error = new Error('Bot not found');
      error.statusCode = 404;
      throw error;
    }

    const customization = await this.customizationRepository.findByBotId(query.botId);

    if (!customization) {
      const error = new Error('Customization not found for this bot');
      error.statusCode = 404;
      throw error;
    }

    return customization;
  }
}

module.exports = GetCustomizationUseCase;
