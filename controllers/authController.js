const authService = require('../services/authService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

// get last login metadata for a user by email, deviceId, or ip
exports.getLastLoginInfo = async (req, res) => {
  try {
    const { email, deviceId, ip } = req.query;
    if (!email && !deviceId && !ip) {
      return responseBuilder.badRequest(res, null, 'email, deviceId, or ip is required');
    }

    const lastLogin = await authService.getLastLoginInfo({ email, deviceId, ip });
    if (!lastLogin) {
      return responseBuilder.notFound(res, null, 'No last login info found');
    }

    return responseBuilder.ok(res, { lastLogin }, 'Last login info fetched');
  } catch (err) {
    logger.error('Error fetching last login info', { error: err.message });
    return responseBuilder.internalError(res, err.message);
  }
};

// update my profile (currently supports name)
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body || {};

    const result = await authService.updateMyProfile(userId, { name });
    logger.info('Updated my profile', { userId });
    return responseBuilder.ok(res, result, 'Profile updated successfully');
  } catch (err) {
    logger.warn('Error updating my profile', { error: err.message, userId: req.user?._id });
    return responseBuilder.badRequest(res, null, err.message);
  }
};

// logout agent user
exports.logoutAgent = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await authService.logoutAgent(userId);

    logger.info('Agent logged out successfully', { userId });
    return responseBuilder.ok(res, result, 'Agent logout successful');
  } catch (err) {
    logger.error('Agent logout failed', { error: err.message });
    return responseBuilder.internalError(res, err.message);
  }
};

// logout bot dashboard user
exports.logoutBot = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await authService.logoutBot(userId);

    logger.info('Bot dashboard user logged out successfully', { userId });
    return responseBuilder.ok(res, result, 'Bot dashboard logout successful');
  } catch (err) {
    logger.error('Bot dashboard logout failed', { error: err.message });
    return responseBuilder.internalError(res, err.message);
  }
};
