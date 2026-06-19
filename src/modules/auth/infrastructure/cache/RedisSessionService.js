'use strict';

const ISessionService = require('../../domain/services/ISessionService');

/**
 * Redis-backed session validator.
 *
 * Validates that a presented access token matches the one stored in Redis for the user,
 * ensuring tokens revoked at logout cannot be replayed.
 *
 * Injects AuthTokenStore rather than calling Redis/tokenUtils directly.
 * This keeps the class thin: one method, one responsibility.
 */
class RedisSessionService extends ISessionService {
  /**
   * @param {import('../token/AuthTokenStore')} tokenStore
   */
  constructor(tokenStore) {
    super();
    this.tokenStore = tokenStore;
  }

  /**
   * Checks whether the access token is still valid in the Redis session store.
   *
   * @param {string} userId
   * @param {string} token - Raw JWT access token presented by the client
   * @returns {Promise<boolean>} true if the Redis-stored token matches
   */
  async validateAccessToken(userId, token) {
    return this.tokenStore.validateToken(userId, token);
  }
}

module.exports = RedisSessionService;
