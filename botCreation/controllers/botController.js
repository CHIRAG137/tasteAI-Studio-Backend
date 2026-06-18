const botService = require('../services/botService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

// create chatbot
exports.createBot = async (req, res) => {
  try {
    const result = await botService.createBot(req);

    logger.info('Bot created successfully', {
      userId: req.user?._id,
      botId: result._id,
    });
    return responseBuilder.created(res, result, 'Bot created successfully');
  } catch (error) {
    logger.error('Create bot error', {
      error: error.message,
      stack: error.stack,
    });
    return responseBuilder.internalError(res, 'Failed to create bot');
  }
};
