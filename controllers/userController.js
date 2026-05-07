const responseBuilder = require('../utils/responseBuilder');
const logger = require('../utils/logger');
const userApiKeyService = require('../services/userApiKeyService');

exports.listMyApiKeys = async (req, res) => {
  try {
    const userId = req.user?._id;
    const result = await userApiKeyService.listMyApiKeys(userId);
    return responseBuilder.ok(res, result, 'API keys fetched successfully');
  } catch (err) {
    logger.error('Error listing API keys', { error: err.message, userId: req.user?._id });
    return responseBuilder.internalError(res, null, err.message);
  }
};

exports.upsertMyApiKey = async (req, res) => {
  try {
    const userId = req.user?._id;
    const provider = req.params.provider;
    const apiKey = req.body?.apiKey;
    const result = await userApiKeyService.upsertMyApiKey(userId, provider, apiKey);
    return responseBuilder.ok(res, result, 'API key saved successfully');
  } catch (err) {
    logger.warn('Error saving API key', { error: err.message, userId: req.user?._id });
    return responseBuilder.badRequest(res, null, err.message);
  }
};

exports.deleteMyApiKey = async (req, res) => {
  try {
    const userId = req.user?._id;
    const provider = req.params.provider;
    const result = await userApiKeyService.deleteMyApiKey(userId, provider);
    return responseBuilder.ok(res, result, 'API key deleted successfully');
  } catch (err) {
    logger.warn('Error deleting API key', { error: err.message, userId: req.user?._id });
    return responseBuilder.badRequest(res, null, err.message);
  }
};

exports.testMyApiKey = async (req, res) => {
  try {
    const userId = req.user?._id;
    const provider = req.params.provider;
    const model = req.body?.model || null;
    const result = await userApiKeyService.testMyApiKey(userId, provider, model);
    return responseBuilder.ok(res, result, 'API key validated successfully');
  } catch (err) {
    logger.warn('Error testing API key', { error: err.message, userId: req.user?._id });
    return responseBuilder.badRequest(res, null, err.message);
  }
};

