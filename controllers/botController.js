const botService = require('../services/botService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const { testCustomLLMConnection } = require('../utils/llmClientUtils');

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

// ask a query to a bot
exports.askBot = async (req, res) => {
  try {
    const { question, botId, sessionId, flowSessionId, chatHistory, matchedAnswer, userEmotion } = req.body;
    const resolvedSessionId = sessionId || flowSessionId;

    const result = await botService.askBot(
      question,
      botId,
      resolvedSessionId,
      null, // userId
      chatHistory,
      matchedAnswer,
      userEmotion
    );

    logger.info('Bot answered question', { botId, question, sessionId: resolvedSessionId });
    return responseBuilder.ok(res, result, 'Bot responded successfully');
  } catch (error) {
    logger.error('Ask bot error', { error: error.message, stack: error.stack });
    return responseBuilder.internalError(res, 'Failed to get bot response');
  }
};

// get all the chatbots(paginated)
exports.getAllChatBots = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    const { bots, pagination } = await botService.getAllChatBots(
      userId,
      { skip, limit, page }
    );

    logger.info('Fetched chat bots', {
      userId,
      page,
      limit,
      returnedCount: bots.length,
      totalBots: pagination.total,
    });

    return responseBuilder.ok(
      res,
      { bots, pagination },
      'Chat bots fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching all chat bots', {
      userId: req.user?.id,
      error: error.message,
    });

    return responseBuilder.internalError(res, 'Failed to fetch bots');
  }
};

// get bot by bot id
exports.getBotByBotId = async (req, res) => {
  try {
    const botId = req.params.botId;
    const bot = await botService.getBotByBotId(botId);

    if (!bot) {
      logger.warn('Bot not found', { botId });
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    logger.info('Fetched bot by ID', { botId });
    return responseBuilder.ok(res, bot, 'Bot fetched successfully');
  } catch (error) {
    logger.error('Error fetching bot by ID', {
      error: error.message,
      botId: req.params.botId,
    });
    return responseBuilder.internalError(res, 'Server error');
  }
};

// delete bot by bot id
exports.deleteBotByBotId = async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.botId;
    await botService.deleteBotByBotId(botId, userId);

    logger.info('Bot deleted successfully', { botId, userId });
    return responseBuilder.ok(
      res,
      null,
      'Bot and associated data deleted successfully'
    );
  } catch (error) {
    logger.error('Error deleting bot', {
      error: error.message,
      botId: req.params.botId,
      userId: req.user.id,
    });
    return responseBuilder.internalError(res, 'Failed to delete bot');
  }
};

// update bot by bot id
exports.updateBotByBotId = async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.botId;
    const files = req.files;

    const updatedBot = await botService.updateBotByBotId(
      botId,
      userId,
      req.body,
      files
    );

    logger.info('Bot updated successfully', { botId, userId });
    return responseBuilder.ok(
      res,
      updatedBot,
      'Bot updated successfully. Previous QAs replaced with new ones (if file uploaded) and added to Slack channel (if enabled).'
    );
  } catch (error) {
    logger.error('Error updating bot', {
      error: error.message,
      botId: req.params.botId,
      userId: req.user.id,
    });
    return responseBuilder.internalError(res, 'Failed to update bot');
  }
};

const extractErrorMessage = (error) => {
  let message = 'Unable to validate custom LLM configuration.';
  if (!error) return message;
  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  } else {
    message = JSON.stringify(error);
  }

  // Remove trailing JSON details from provider errors for user-friendly display
  const cleaned = message.replace(/\s*(\[\{.*|\{.*)$/s, '').trim();
  return cleaned || message;
};

// test custom LLM provider connection
exports.testCustomLLMConnection = async (req, res) => {
  try {
    const { custom_llm_provider, custom_api_key, custom_model } = req.body;

    if (!custom_llm_provider || !['openai', 'gemini'].includes(custom_llm_provider)) {
      return responseBuilder.badRequest(
        res,
        null,
        'Invalid or missing custom_llm_provider. Must be "openai" or "gemini".'
      );
    }

    if (!custom_api_key) {
      return responseBuilder.badRequest(
        res,
        null,
        'API key is required to validate custom LLM configuration.'
      );
    }

    await testCustomLLMConnection(custom_llm_provider, custom_api_key, custom_model);

    return responseBuilder.ok(
      res,
      { validated: true },
      'Custom LLM provider and API key validated successfully.'
    );
  } catch (error) {
    logger.error('Error validating custom LLM connection', {
      error: error.message,
      userId: req.user?.id,
    });
    const message = extractErrorMessage(error);
    return responseBuilder.badRequest(res, null, message);
  }
};

// get bot customization by bot id
exports.getBotCustomizationByBotId = async (req, res) => {
  try {
    const { botId } = req.params;

    const customization = await botService.getCustomizationByBotId(botId);

    logger.info('Customization fetched successfully', {
      botId,
      userId: req.user?.id,
    });
    return responseBuilder.ok(
      res,
      customization,
      'Customization fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching customization', {
      error: error.message,
      botId: req.params.botId,
      userId: req.user?.id,
    });
    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch customization'
    );
  }
};

// save bot customisation
exports.saveBotCustomization = async (req, res) => {
  try {
    const { botId } = req.params;
    logger.info('Saving customization', {
      botId,
      userId: req.user?.id,
      body: req.body,
    });

    const customization = await botService.saveBotCustomization(botId, req.body);

    logger.info('Customization saved successfully', {
      botId,
      userId: req.user?.id,
    });
    return responseBuilder.ok(
      res,
      customization,
      'Customization saved successfully'
    );
  } catch (error) {
    logger.error('Error saving customization', {
      error: error.message,
      botId: req.params.botId,
      userId: req.user?.id,
    });
    return responseBuilder.internalError(
      res,
      null,
      'Failed to save customization'
    );
  }
};

// get all chat histories by bot id(paginated)
exports.getAllChatHistoriesByBotId = async (req, res) => {
  const { botId } = req.params;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

  try {
    logger.info('Fetching all chat histories', {
      botId,
      userId: req.user?.id,
      page,
      limit,
    });

    const result = await botService.getAllChatHistoriesByBotId(
      botId,
      page,
      limit
    );

    logger.info('Fetched all chat histories successfully', {
      botId,
      userId: req.user?.id,
      page,
      limit,
      totalSessions: result.totalSessions,
      totalPages: result.totalPages,
    });

    return responseBuilder.ok(
      res,
      result,
      'Chat histories fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching all chat histories', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch chat histories'
    );
  }
};

// get chat history by session id
exports.getChatHistoryBySessionId = async (req, res) => {
  const { botId, sessionId } = req.params;
  try {
    logger.info('Fetching specific chat history', {
      botId,
      sessionId,
      userId: req.user?.id,
    });

    const result = await botService.getChatHistoryBySessionId(botId, sessionId);

    logger.info('Fetched specific chat history successfully', {
      botId,
      sessionId,
      userId: req.user?.id,
    });

    return responseBuilder.ok(res, result, 'Chat history fetched successfully');
  } catch (error) {
    logger.error('Error fetching specific chat history', {
      error: error.message,
      botId,
      sessionId,
      userId: req.user?.id,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch chat history'
    );
  }
};

// get spreadsheet configuration for a bot
exports.getSpreadsheetConfig = async (req, res) => {
  const { botId } = req.params;
  try {
    logger.info('Fetching spreadsheet configuration', { botId, userId: req.user?.id });

    const result = await botService.getSpreadsheetConfigForBot(botId, req.user?.id);

    return responseBuilder.ok(res, result, 'Spreadsheet configuration fetched successfully');
  } catch (error) {
    logger.error('Error fetching spreadsheet configuration', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch spreadsheet configuration'
    );
  }
};

// configure spreadsheet columns for a bot
exports.configureSpreadsheetColumns = async (req, res) => {
  const { botId } = req.params;
  const { outputColumn, inputColumns } = req.body;
  try {
    logger.info('Configuring spreadsheet columns', {
      botId,
      userId: req.user?.id,
      outputColumn,
      inputColumnsCount: inputColumns?.length || 0,
    });

    if (!outputColumn || !inputColumns || inputColumns.length === 0) {
      return responseBuilder.badRequest(
        res,
        null,
        'outputColumn and inputColumns are required'
      );
    }

    const result = await botService.configureSpreadsheetColumns(
      botId,
      req.user?.id,
      outputColumn,
      inputColumns
    );

    logger.info('Spreadsheet columns configured successfully', { botId });

    return responseBuilder.ok(res, result, 'Spreadsheet columns configured successfully');
  } catch (error) {
    logger.error('Error configuring spreadsheet columns', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to configure spreadsheet columns'
    );
  }
};

// get Gemini suggestions for column configuration
exports.getSuggestedColumnConfiguration = async (req, res) => {
  const { botId } = req.params;
  try {
    logger.info('Getting suggested column configuration', { botId, userId: req.user?.id });

    const result = await botService.getSuggestedColumnConfigForBot(botId, req.user?.id);

    return responseBuilder.ok(res, result, 'Column suggestions retrieved successfully');
  } catch (error) {
    logger.error('Error getting column suggestions', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to get column suggestions'
    );
  }
};
