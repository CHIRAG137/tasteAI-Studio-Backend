const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuthUserModel = require('../src/modules/auth/infrastructure/persistence/UserModel');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const { isExpired: isTokenExpired } = require('../utils/tokenUtils');

exports.authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;

  if (!token) {
    logger.warn('Authentication failed - no token provided');
    return responseBuilder.unauthorized(res, null, 'No token provided');
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    }
    const userId = decoded.id || decoded.sub;
    let user = await User.findById(userId);
    if (!user) {
      user = await AuthUserModel.findById(userId);
    }

    if (!user) {
      logger.warn('Authentication failed - user not found', {
        userId,
      });
      return responseBuilder.unauthorized(res, null, 'User not found');
    }

    // Check if token is expired in the database (legacy tokens only)
    if (user.authTokenExpiresAt && isTokenExpired(user.authTokenExpiresAt)) {
      logger.warn('Authentication failed - token expired', {
        userId: user._id,
        expiresAt: user.authTokenExpiresAt,
      });
      user.authToken = null;
      user.authTokenExpiresAt = null;
      user.isActive = false;
      await user.save();
      return responseBuilder.unauthorized(res, null, 'Token expired');
    }

    // For legacy tokens, verify database match; skip for new-format tokens
    if (user.authToken !== null && user.authToken !== token) {
      logger.warn('Authentication failed - token mismatch', {
        userId: user._id,
      });
      return responseBuilder.unauthorized(res, null, 'Invalid token');
    }

    req.user = user;
    logger.info('Authentication successful', {
      userId: user._id,
      email: user.email,
    });
    next();
  } catch (err) {
    logger.error('Authentication failed', { error: err.message });
    return responseBuilder.unauthorized(res, null, 'Unauthorized');
  }
};
