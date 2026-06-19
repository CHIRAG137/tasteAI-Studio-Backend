'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');
const logger = require('../../../shared/logging');

/**
 * Authentication middleware.
 *
 * Provides two request guards:
 *   - requireAuth: rejects unauthenticated requests
 *   - optionalAuth: attaches user if a valid token is present, passes through if not
 *
 * Both methods use a shared token extraction helper to eliminate duplication.
 */
class AuthMiddleware {
  /**
   * @param {object} deps
   * @param {import('../../domain/services/ITokenService')} deps.tokenService
   * @param {import('../../domain/services/ISessionService')} deps.sessionService
   * @param {import('../../domain/repositories/IUserRepository')} deps.userRepository
   */
  constructor({ tokenService, sessionService, userRepository }) {
    this.tokenService = tokenService;
    this.sessionService = sessionService;
    this.userRepository = userRepository;
  }

  /**
   * Extracts the Bearer token from the Authorization header.
   * @private
   * @returns {string | null}
   */
  static _extractBearerToken(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length);
  }

  /**
   * Verifies the token, validates the Redis session, and loads the user.
   * Returns the user entity on success, or null/error on failure.
   * @private
   */
  async _resolveUser(token, req) {
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

  /**
   * Requires a valid authenticated session.
   * Returns 401 if missing/invalid; 403 if account is inactive or banned.
   */
  requireAuth = async (req, res, next) => {
    const token = AuthMiddleware._extractBearerToken(req);

    if (!token) {
      logger.warn('Auth failed — missing Bearer token', { ip: req.clientIp, path: req.path });
      return ApiResponse.unauthorized(res, null, 'Authentication required');
    }

    const { user, reason, userId } = await this._resolveUser(token, req);

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

  /**
   * Optionally attaches the authenticated user if a valid token is present.
   * Never rejects the request — unauthenticated requests pass through.
   */
  optionalAuth = async (req, _res, next) => {
    const token = AuthMiddleware._extractBearerToken(req);
    if (!token) {
      return next();
    }

    try {
      const { user } = await this._resolveUser(token, req);
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
