const summarizerService = require('../services/summarizeService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

// summarize session conversion using gemini
exports.summarizeSessionConversation = async (req, res) => {
  try {
    const { messages, botName, sessionId, botId } = req.body;

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
      sessionId,
    });

    const summary = await summarizerService.summarizeConversationWithGemini(
      messages,
      botName
    );

    // Save summary to session if sessionId and botId are provided
    if (sessionId && botId) {
      try {
        const FlowSession = require('../models/FlowSession');
        await FlowSession.updateOne(
          { _id: sessionId, bot: botId },
          {
            summary,
            summaryGeneratedAt: new Date(),
          }
        );
        logger.info('Summary saved to FlowSession', { sessionId, botId });
      } catch (updateError) {
        logger.warn('Failed to save summary to session', {
          sessionId,
          botId,
          error: updateError.message,
        });
        // Continue without failing the response
      }
    }

    logger.info('Conversation summarization completed', {
      botName,
      messageCount: messages.length,
      summaryLength: summary?.length || 0,
      sessionId,
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
