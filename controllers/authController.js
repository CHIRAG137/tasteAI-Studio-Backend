const authService = require('../services/authService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

function getLoginMeta(req) {
  return {
    ip: req.clientIp || req.ip || 'Unknown',
    device: req.userAgent || req.headers['user-agent'] || 'Unknown',
    deviceId: req.body?.deviceId || null,
  };
}

// register user
exports.registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.registerUser(email, password, name, getLoginMeta(req));

    logger.info('User registered successfully', { email });
    return responseBuilder.created(res, result, 'User registered successfully');
  } catch (err) {
    logger.error('User registration failed', { error: err.message });
    return responseBuilder.badRequest(res, null, err.message);
  }
};

// login user
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password, getLoginMeta(req));

    logger.info('User logged in', { email });
    return responseBuilder.ok(res, result, 'Login successful');
  } catch (err) {
    logger.warn('Login failed', { error: err.message, email: req.body.email });
    return responseBuilder.unauthorized(res, null, err.message);
  }
};

// login / register via Auth0 Universal Login (SPA sends Auth0 access token)
exports.auth0LoginUser = async (req, res) => {
  try {
    const accessToken = req.body.accessToken;
    if (!accessToken) {
      return responseBuilder.badRequest(res, null, 'accessToken is required');
    }
    const result = await authService.auth0LoginUser(accessToken, getLoginMeta(req));
    logger.info('Auth0 login successful');
    return responseBuilder.ok(res, result, 'Auth0 login successful');
  } catch (err) {
    logger.warn('Auth0 login failed', { error: err.message });
    return responseBuilder.unauthorized(res, null, err.message);
  }
};

// login user via google login
exports.googleLoginUser = async (req, res) => {
  try {
    const googleToken = req.body.token;
    const result = await authService.googleLoginUser(googleToken, getLoginMeta(req));

    logger.info('Google login successful');
    return responseBuilder.ok(res, result, 'Google login successful');
  } catch (err) {
    logger.warn('Google login failed', { error: err.message });
    return responseBuilder.unauthorized(res, null, err.message);
  }
};

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

// get user details by user id
exports.getUserDetailsByUserId = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await authService.getUserDetailsByUserId(userId);

    if (!result) {
      logger.warn('User not found', { userId });
      return responseBuilder.notFound(res, null, 'User not found');
    }

    logger.info('Fetched user details', { userId });
    return responseBuilder.ok(res, result, 'User details fetched successfully');
  } catch (err) {
    logger.error('Error fetching user details', { error: err.message });
    return responseBuilder.internalError(res, err.message);
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
