const summarizerService = require('../services/summarizeService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

// summarize session conversion using gemini
exports.summarizeSessionConversation = async (req, res) => {
  try {
    const { messages, botName } = req.body;

    // Validation
    if (!Array.isArray(messages) || messages.length === 0) {
      logger.warn('Summarization failed - invalid messages payload', {
        botName,
        messageCount: Array.isArray(messages) ? messages.length : 0,
      });

      return responseBuilder.badRequest(
        res,
        null,
        'Messages array is required.'
      );
    }

    logger.info('Starting conversation summarization', {
      botName,
      messageCount: messages.length,
    });

    const summary = await summarizerService.summarizeConversationWithGemini(
      messages,
      botName
    );

    logger.info('Conversation summarization completed', {
      botName,
      messageCount: messages.length,
      summaryLength: summary?.length || 0,
    });

    return responseBuilder.ok(res, {
      summary,
    });
  } catch (error) {
    logger.error('Error during conversation summarization', {
      error: error.message,
      stack: error.stack,
    });

    return responseBuilder.internalError(
      res,
      null,
      error.message || 'Failed to summarize conversation.'
    );
  }
};
