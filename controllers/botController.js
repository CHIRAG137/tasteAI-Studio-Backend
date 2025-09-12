const botService = require("../services/botService");
const logger = require("../utils/logger");
const responseBuilder = require("../utils/responseBuilder");

exports.createBot = async (req, res) => {
  try {
    const result = await botService.createBot(req);

    logger.info("Bot created successfully", { userId: req.user?._id, botId: result._id });
    return responseBuilder.created(res, result, "Bot created successfully");
  } catch (error) {
    logger.error("Create bot error", { error: error.message, stack: error.stack });
    return responseBuilder.error(res, "Failed to create bot");
  }
};

exports.askBot = async (req, res) => {
  try {
    const { question, botId } = req.body;
    const result = await botService.askBot(question, botId);

    logger.info("Bot answered question", { botId, question });
    return responseBuilder.success(res, result, "Bot responded successfully");
  } catch (error) {
    logger.error("Ask bot error", { error: error.message, stack: error.stack });
    return responseBuilder.error(res, "Failed to get bot response");
  }
};

exports.getAllChatBots = async (req, res) => {
  try {
    const userId = req.user.id;
    const bots = await botService.getAllChatBots(userId);

    logger.info("Fetched all chat bots", { userId, count: bots.length });
    return responseBuilder.success(res, { bots }, "Chat bots fetched successfully");
  } catch (error) {
    logger.error("Error fetching all chat bots", { error: error.message });
    return responseBuilder.internalError(res, "Failed to fetch bots");
  }
};

exports.getBotById = async (req, res) => {
  try {
    const botId = req.params.botId;
    const bot = await botService.getBotById(botId);

    if (!bot) {
      logger.warn("Bot not found", { botId });
      return responseBuilder.notFound(res, null, "Bot not found");
    }

    logger.info("Fetched bot by ID", { botId });
    return responseBuilder.success(res, bot, "Bot fetched successfully");
  } catch (error) {
    logger.error("Error fetching bot by ID", { error: error.message, botId: req.params.botId });
    return responseBuilder.internalError(res, "Server error");
  }
};

exports.deleteBot = async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.botId;
    await botService.deleteBot(botId, userId);

    logger.info("Bot deleted successfully", { botId, userId });
    return responseBuilder.success(res, null, "Bot and associated data deleted successfully");
  } catch (error) {
    logger.error("Error deleting bot", { error: error.message, botId: req.params.botId, userId: req.user.id });
    return responseBuilder.internalError(res, "Failed to delete bot");
  }
};

exports.updateBot = async (req, res) => {
  try {
    const userId = req.user.id;
    const botId = req.params.botId;
    const file = req.file;

    const updatedBot = await botService.updateBot(botId, userId, req.body, file);

    logger.info("Bot updated successfully", { botId, userId });
    return responseBuilder.success(
      res,
      updatedBot,
      "Bot updated successfully. Previous QAs replaced with new ones (if file uploaded) and added to Slack channel (if enabled)."
    );
  } catch (error) {
    logger.error("Error updating bot", { error: error.message, botId: req.params.botId, userId: req.user.id });
    return responseBuilder.internalError(res, "Failed to update bot");
  }
};
