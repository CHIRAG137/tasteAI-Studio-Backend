'use strict';

const User = require('../models/user');
const { verifyAccessToken, isExpired } = require('../../utils/tokenUtils');
const responseBuilder = require('../../utils/responseBuilder');
const logger = require('../../utils/logger');

/**
 * Protect routes that require a valid, non-expired access token.
 *
 * Attaches req.user (full Mongoose document) for downstream handlers.
 *
 * Token is expected as: Authorization: Bearer <accessToken>
 */
exports.authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Auth failed — missing or malformed Authorization header', {
      ip: req.clientIp,
    });
    return responseBuilder.unauthorized(res, null, 'Authentication required');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    logger.warn('Auth failed — invalid token signature', {
      error: err.message,
      ip: req.clientIp,
    });
    return responseBuilder.unauthorized(res, null, 'Invalid or expired token');
  }

  if (decoded.type !== 'access') {
    return responseBuilder.unauthorized(res, null, 'Invalid token type');
  }

  const user = await User.findById(decoded.sub);

  if (!user) {
    logger.warn('Auth failed — user not found', { sub: decoded.sub });
    return responseBuilder.unauthorized(res, null, 'User not found');
  }

  // Single-session enforcement: token must match what is in DB
  if (user.tokens?.accessToken !== token) {
    logger.warn('Auth failed — token mismatch (possible replay)', {
      userId: user._id,
    });
    return responseBuilder.unauthorized(res, null, 'Session invalidated. Please log in again.');
  }

  // Belt-and-suspenders: DB-side expiry check
  if (isExpired(user.tokens?.accessTokenExpiresAt)) {
    logger.warn('Auth failed — access token expired in DB', {
      userId: user._id,
    });
    return responseBuilder.unauthorized(res, null, 'Token expired');
  }

  if (!user.isActive) {
    return responseBuilder.forbidden(res, null, 'Account not yet activated');
  }

  if (user.isBanned) {
    return responseBuilder.forbidden(res, null, 'Account suspended');
  }

  req.user = user;
  logger.info('Authenticated', { userId: user._id, email: user.email });
  return next();
};
