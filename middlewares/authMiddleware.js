const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const { isTokenExpired } = require('../utils/tokenUtils');

exports.authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;

  if (!token) {
    logger.warn('Authentication failed - no token provided');
    return responseBuilder.unauthorized(res, null, 'No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      logger.warn('Authentication failed - user not found', {
        userId: decoded.id,
      });
      return responseBuilder.unauthorized(res, null, 'User not found');
    }

    // Check if token is expired in the database
    if (isTokenExpired(user.authTokenExpiresAt)) {
      logger.warn('Authentication failed - token expired', {
        userId: user._id,
        expiresAt: user.authTokenExpiresAt,
      });
      // Clear expired token from database
      user.authToken = null;
      user.authTokenExpiresAt = null;
      user.isActive = false;
      await user.save();
      return responseBuilder.unauthorized(res, null, 'Token expired');
    }

    // Check if token in header matches token in database
    if (user.authToken !== token) {
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
