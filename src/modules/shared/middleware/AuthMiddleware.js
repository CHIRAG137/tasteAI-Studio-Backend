'use strict';

const ApiResponse = require('../response/ApiResponse');
const logger = require('../logging');

class AuthMiddleware {
  constructor({ tokenService, sessionService, userRepository }) {
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.userRepository = userRepository;
  }

  static _extractBearerToken(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length);
  }

  async _resolveUser(token) {
    let decoded;
    try {
      decoded = this.tokenService.verifyAccessToken(token);
    } catch {
      return { user: null, reason: 'bad_jwt' };
    }

    const userId = decoded.sub;
    const sessionValid = await this.sessionService.validateAccessToken(userId, token);
    if (!sessionValid) {
      return { user: null, reason: 'session_invalid', userId };
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { user: null, reason: 'user_not_found', userId };
    }

    return { user, userId };
  }

  requireAuth = async (req, res, next) => {
    const token = AuthMiddleware._extractBearerToken(req);

    if (!token) {
      logger.warn('Auth failed — missing Bearer token', { ip: req.clientIp, path: req.path });
      return ApiResponse.unauthorized(res, null, 'Authentication required');
    }

    const { user, reason, userId } = await this._resolveUser(token);

    if (!user) {
      logger.warn('Auth failed', { reason, ip: req.clientIp, userId });
      return ApiResponse.unauthorized(res, null, 'Invalid or expired token');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, null, 'Account not yet activated');
    }

    if (user.isBanned) {
      return ApiResponse.forbidden(res, null, 'Account suspended');
    }

    req.user = user;
    req.auth = { token, userId: user.id };
    logger.info('Authenticated', { userId: user.id });

    return next();
  };

  optionalAuth = async (req, _res, next) => {
    const token = AuthMiddleware._extractBearerToken(req);
    if (!token) {
      return next();
    }

    try {
      const { user } = await this._resolveUser(token);
      if (user && user.isActive && !user.isBanned) {
        req.user = user;
        req.auth = { token, userId: user.id };
      }
    } catch (err) {
      logger.debug('Optional auth skipped', { error: err.message });
    }

    return next();
  };
}

module.exports = AuthMiddleware;
