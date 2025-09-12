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
