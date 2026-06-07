const botService = require('../services/botService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const { testCustomLLMConnection } = require('../utils/llmClientUtils');
const ChatBot = require('../models/ChatBot');
const { enforceVisitorEmailVerificationForBot } = require('../utils/visitorEmailOtpEnforce');
const arizeInsightService = require('../services/arizeInsightService');

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

    const bot = await ChatBot.findById(botId).lean();
    if (bot) {
      const ok = await enforceVisitorEmailVerificationForBot(req, res, bot);
      if (!ok) return;
    }

    const result = await botService.askBot(
      question,
      botId,
      resolvedSessionId,
      null, // userId
      chatHistory,
      matchedAnswer,
      userEmotion
    );

    const llmType = bot?.custom_llm_provider 
      ? `custom (${bot.custom_llm_provider}, model: ${bot.custom_model || 'default'})`
      : 'default';
    
    logger.info('Bot answered question', { 
      botId, 
      question, 
      sessionId: resolvedSessionId,
      llmProvider: llmType
    });
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

    if (!custom_llm_provider || !['openai', 'gemini', 'gemma'].includes(custom_llm_provider)) {
      return responseBuilder.badRequest(
        res,
        null,
        'Invalid or missing custom_llm_provider. Must be "openai", "gemini", or "gemma".'
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

// get product-friendly Phoenix trace timeline for a session
exports.getSessionTraceTimeline = async (req, res) => {
  const { botId, sessionId } = req.params;

  try {
    logger.info('Fetching session trace timeline', {
      botId,
      sessionId,
      userId: req.user?.id,
    });

    const result = await botService.getSessionTraceTimeline(botId, sessionId);

    return responseBuilder.ok(
      res,
      result,
      'Session trace timeline fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching session trace timeline', {
      error: error.message,
      botId,
      sessionId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found' || error.message === 'Chat history not found') {
      return responseBuilder.notFound(res, null, error.message);
    }

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch session trace timeline'
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

// get Arize/Phoenix observability insights for a bot
exports.getBotObservabilityInsights = async (req, res) => {
  const { botId } = req.params;

  try {
    const result = await arizeInsightService.getBotObservabilityInsights(
      botId,
      req.user?.id
    );

    return responseBuilder.ok(
      res,
      result,
      'Bot observability insights fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching bot observability insights', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch bot observability insights'
    );
  }
};

// get self-improvement inbox for a bot
exports.getBotSelfImprovementDashboard = async (req, res) => {
  const { botId } = req.params;

  try {
    const result = await arizeInsightService.getBotSelfImprovementDashboard(
      botId,
      req.user?.id
    );

    return responseBuilder.ok(
      res,
      result,
      'Bot self-improvement dashboard fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching bot self-improvement dashboard', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch bot self-improvement dashboard'
    );
  }
};

// apply action to a self-improvement item
exports.applyBotImprovementAction = async (req, res) => {
  const { botId } = req.params;
  const { itemKey, action, item } = req.body || {};

  if (!itemKey || !action) {
    return responseBuilder.badRequest(
      res,
      null,
      'itemKey and action are required'
    );
  }

  try {
    const result = await arizeInsightService.applyImprovementAction({
      botId,
      userId: req.user?.id,
      itemKey,
      action,
      item,
    });

    return responseBuilder.ok(
      res,
      result,
      'Bot improvement action applied successfully'
    );
  } catch (error) {
    logger.error('Error applying bot improvement action', {
      error: error.message,
      botId,
      itemKey,
      action,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to apply bot improvement action'
    );
  }
};

// ask the private Phoenix self-introspection tool a question
exports.askBotSelfIntrospection = async (req, res) => {
  const { botId } = req.params;
  const { question } = req.body || {};

  if (!question || !String(question).trim()) {
    return responseBuilder.badRequest(
      res,
      null,
      'question is required'
    );
  }

  try {
    const result = await arizeInsightService.askBotSelfIntrospection({
      botId,
      userId: req.user?.id,
      question,
    });

    return responseBuilder.ok(
      res,
      result,
      'Bot self-introspection completed successfully'
    );
  } catch (error) {
    logger.error('Error running bot self-introspection', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to run bot self-introspection'
    );
  }
};

exports.buildBotEvalDataset = async (req, res) => {
  const { botId } = req.params;
  const { sourceType, customTypeId } = req.body || {};

  if (!sourceType && !customTypeId) {
    return responseBuilder.badRequest(
      res,
      null,
      'sourceType or customTypeId is required'
    );
  }

  try {
    const result = await arizeInsightService.buildEvalDatasetFromProduction({
      botId,
      userId: req.user?.id,
      sourceType: sourceType || 'custom',
      customTypeId,
    });

    return responseBuilder.ok(res, result, 'Eval dataset created successfully');
  } catch (error) {
    logger.error('Error building bot eval dataset', {
      error: error.message,
      botId,
      sourceType,
      customTypeId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to build eval dataset'
    );
  }
};

exports.createBotEvalDatasetType = async (req, res) => {
  const { botId } = req.params;

  try {
    const result = await arizeInsightService.createEvalDatasetType({
      botId,
      userId: req.user?.id,
      payload: req.body || {},
    });

    return responseBuilder.created(
      res,
      result,
      'Custom eval dataset type created successfully'
    );
  } catch (error) {
    logger.error('Error creating bot eval dataset type', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to create eval dataset type'
    );
  }
};

exports.getBotEvalDatasetTypes = async (req, res) => {
  const { botId } = req.params;

  try {
    const result = await arizeInsightService.listEvalDatasetTypes(
      botId,
      req.user?.id
    );

    return responseBuilder.ok(
      res,
      result,
      'Eval dataset types fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching bot eval dataset types', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to fetch eval dataset types'
    );
  }
};

exports.deleteBotEvalDatasetType = async (req, res) => {
  const { botId, typeId } = req.params;

  try {
    const result = await arizeInsightService.deleteEvalDatasetType({
      botId,
      userId: req.user?.id,
      typeId,
    });

    return responseBuilder.ok(
      res,
      result,
      'Custom eval dataset type deleted successfully'
    );
  } catch (error) {
    logger.error('Error deleting bot eval dataset type', {
      error: error.message,
      botId,
      typeId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    if (error.message === 'Custom eval dataset type not found') {
      return responseBuilder.notFound(res, null, error.message);
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to delete eval dataset type'
    );
  }
};

exports.getBotEvalDatasets = async (req, res) => {
  const { botId } = req.params;

  try {
    const result = await arizeInsightService.getEvalDatasets(
      botId,
      req.user?.id
    );

    return responseBuilder.ok(res, result, 'Eval datasets fetched successfully');
  } catch (error) {
    logger.error('Error fetching bot eval datasets', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch eval datasets'
    );
  }
};

exports.runBotLLMJudge = async (req, res) => {
  const { botId } = req.params;
  const {
    datasetName = 'all',
    evalMode = 'standard',
    selectedCriteria = [],
    passThreshold = 0.7,
  } = req.body || {};

  try {
    const result = await arizeInsightService.runLLMJudgeForBot({
      botId,
      userId: req.user?.id,
      datasetName,
      evalMode,
      selectedCriteria,
      passThreshold,
    });

    return responseBuilder.ok(res, result, 'LLM-as-a-Judge eval completed');
  } catch (error) {
    logger.error('Error running bot LLM judge', {
      error: error.message,
      botId,
      datasetName,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to run LLM-as-a-Judge eval'
    );
  }
};

exports.getBotExperiments = async (req, res) => {
  const { botId } = req.params;

  try {
    const result = await arizeInsightService.getBotExperiments(
      botId,
      req.user?.id
    );

    return responseBuilder.ok(res, result, 'Bot experiments fetched successfully');
  } catch (error) {
    logger.error('Error fetching bot experiments', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch bot experiments'
    );
  }
};

exports.createBotExperiment = async (req, res) => {
  const { botId } = req.params;

  try {
    const result = await arizeInsightService.createBotExperiment({
      botId,
      userId: req.user?.id,
      data: req.body,
    });

    return responseBuilder.created(res, result, 'Bot experiment created successfully');
  } catch (error) {
    logger.error('Error creating bot experiment', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found') {
      return responseBuilder.notFound(res, null, 'Bot not found');
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to create bot experiment'
    );
  }
};

exports.runBotExperiment = async (req, res) => {
  const { botId, experimentId } = req.params;

  try {
    const result = await arizeInsightService.runBotExperiment({
      botId,
      userId: req.user?.id,
      experimentId,
    });

    return responseBuilder.ok(res, result, 'Bot experiment completed successfully');
  } catch (error) {
    logger.error('Error running bot experiment', {
      error: error.message,
      botId,
      experimentId,
      userId: req.user?.id,
    });

    if (error.message === 'Bot not found' || error.message === 'Experiment not found') {
      return responseBuilder.notFound(res, null, error.message);
    }

    return responseBuilder.badRequest(
      res,
      null,
      error.message || 'Failed to run bot experiment'
    );
  }
};
