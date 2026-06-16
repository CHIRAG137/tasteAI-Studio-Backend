'use strict';

const User = require('../models/user');
const { verifyAccessToken, validateAccessToken } = require('../../utils/tokenUtils');
const responseBuilder = require('../../utils/responseBuilder');
const logger = require('../../utils/logger');

/**
 * authMiddleware — protect routes requiring a valid session.
 *
 * Validation order (fast-fail):
 *  1. JWT signature + expiry (cryptographic, no I/O)
 *  2. Token type check
 *  3. Redis single-session check — O(1), sub-millisecond
 *  4. MongoDB user load — only if Redis passes (for isActive/isBanned/req.user)
 *
 * This means banned/inactive checks still require a MongoDB read,
 * but the hot-path token validation never touches MongoDB.
 */
exports.authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Auth failed — missing Authorization header', { ip: req.clientIp });
    return responseBuilder.unauthorized(res, null, 'Authentication required');
  }

  const token = authHeader.split(' ')[1];

  // Step 1: Verify JWT signature + expiry (pure crypto, no I/O)
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    logger.warn('Auth failed — bad JWT', { error: err.message, ip: req.clientIp });
    return responseBuilder.unauthorized(res, null, 'Invalid or expired token');
  }

  if (decoded.type !== 'access') {
    return responseBuilder.unauthorized(res, null, 'Invalid token type');
  }

  const userId = decoded.sub;

  // Step 2: Redis single-session enforcement — O(1)
  // Redis key access:<userId> stores the current valid access token.
  // If the stored value doesn't match → user logged out or logged in elsewhere.
  const sessionValid = await validateAccessToken(userId, token);
  if (!sessionValid) {
    logger.warn('Auth failed — Redis session mismatch or evicted', { userId });
    return responseBuilder.unauthorized(
      res,
      null,
      'Session expired or invalidated. Please log in again.',
    );
  }

  // Step 3: Load user from MongoDB for account flags + attaching to req
  const user = await User.findById(userId);
  if (!user) {
    logger.warn('Auth failed — user not found in MongoDB', { userId });
    return responseBuilder.unauthorized(res, null, 'User not found');
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

/**
 * optionalAuth — attach req.user if a valid session exists, never block.
 */
exports.optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const valid = await validateAccessToken(decoded.sub, token);
    if (valid) {
      const user = await User.findById(decoded.sub);
      if (user && user.isActive && !user.isBanned) {
        req.user = user;
      }
    }
  } catch (_) {
    // silently skip — optional auth never blocks
  }
  return next();
};
