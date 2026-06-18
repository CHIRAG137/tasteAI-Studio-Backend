'use strict';

const { validateAccessToken } = require('../../../../../utils/tokenUtils');
const ISessionService = require('../../domain/services/ISessionService');

/**
 * Redis-backed session validator.
 *
 * Validates that the presented access token matches the one stored in Redis
 * for the given user, preventing use of tokens that have been revoked server-side.
 */
class RedisSessionService extends ISessionService {
  /**
   * @param {string} userId
   * @param {string} token - Raw JWT access token
   * @returns {Promise<boolean>}
   */
  async validateAccessToken(userId, token) {
    const result = await validateAccessToken(userId, token);
    return Boolean(result);
  }
}

module.exports = RedisSessionService;
