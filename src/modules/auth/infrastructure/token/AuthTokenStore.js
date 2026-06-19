'use strict';

const IRedisClient = require('../redis/IRedisClient');
const AuthRedisKeyScheme = require('../redis/AuthRedisKeyScheme');
const JwtSigner = require('./JwtSigner');

/**
 * Redis-backed token session store for the auth module.
 *
 * Single Responsibility: persisting and reading auth token session data from Redis.
 *   - No JWT signing/verification — that belongs to JwtSigner.
 *   - No user repository access — that belongs to JwtTokenService.
 *   - Depends on IRedisClient (injected) for full testability.
 *
 * Key TTLs:
 *   Access token  → 15 min
 *   Refresh token → 30 days
 *   Family id     → 30 days
 *
 * Injected into: JwtTokenService, RedisSessionService
 */
class AuthTokenStore {
  /**
   * @param {IRedisClient} redisClient
   */
  constructor(redisClient) {
    this.redis = redisClient;
  }

  /**
   * Atomically persists a complete token pair in Redis.
   *
   * Stores:
   *   access:<userId>       = raw access token   (TTL 15 min)
   *   refresh:<hash>        = userId             (TTL 30 days)
   *   family:<familyId>     = userId             (TTL 30 days)
   *
   * @param {{ userId: string, accessToken: string, refreshHashed: string, family: string }} params
   */
  async storeTokenPair({ userId, accessToken, refreshHashed, family }) {
    await this.redis.pipeline([
      {
        cmd: 'set',
        args: [
          AuthRedisKeyScheme.access(userId),
          accessToken,
          { EX: JwtSigner.ACCESS_TOKEN_EXPIRY_S },
        ],
      },
      {
        cmd: 'set',
        args: [
          AuthRedisKeyScheme.refresh(refreshHashed),
          userId.toString(),
          { EX: JwtSigner.REFRESH_TOKEN_EXPIRY_S },
        ],
      },
      {
        cmd: 'set',
        args: [
          AuthRedisKeyScheme.family(family),
          userId.toString(),
          { EX: JwtSigner.REFRESH_TOKEN_EXPIRY_S },
        ],
      },
    ]);
  }

  /**
   * Validates an access token against the one stored in Redis.
   * Prevents use of tokens that were revoked server-side after a logout or rotation.
   *
   * @param {string} userId
   * @param {string} token - The raw access token presented by the client
   * @returns {Promise<boolean>} true if the token matches the stored value
   */
  async validateToken(userId, token) {
    const stored = await this.redis.get(AuthRedisKeyScheme.access(userId));
    return stored === token;
  }

  /**
   * Looks up the userId that owns a given refresh token hash.
   *
   * @param {string} hashed - SHA-256 hash of the raw refresh token
   * @returns {Promise<string | null>} userId or null if not found / expired
   */
  async lookupRefresh(hashed) {
    return this.redis.get(AuthRedisKeyScheme.refresh(hashed));
  }

  /**
   * Looks up the userId that owns a given token family id.
   *
   * @param {string} familyId
   * @returns {Promise<string | null>}
   */
  async lookupFamily(familyId) {
    return this.redis.get(AuthRedisKeyScheme.family(familyId));
  }

  /**
   * Deletes a specific refresh token — used during token rotation.
   * After deletion the old token is permanently invalidated.
   *
   * @param {string} hashed
   */
  async deleteRefresh(hashed) {
    await this.redis.del(AuthRedisKeyScheme.refresh(hashed));
  }

  /**
   * Clears all session keys for a user (logout / forced termination).
   *
   * @param {string} userId
   * @param {string | null} refreshHashed
   * @param {string | null} family
   */
  async clearSession(userId, refreshHashed, family) {
    const ops = [{ cmd: 'del', args: [AuthRedisKeyScheme.access(userId)] }];

    if (refreshHashed) {
      ops.push({ cmd: 'del', args: [AuthRedisKeyScheme.refresh(refreshHashed)] });
    }
    if (family) {
      ops.push({ cmd: 'del', args: [AuthRedisKeyScheme.family(family)] });
    }

    await this.redis.pipeline(ops);
  }

  /**
   * Wipes all tokens for a token family — triggered on refresh token reuse detection.
   * Forces all concurrent sessions derived from this family to re-authenticate.
   *
   * @param {string} familyId
   * @param {string} userId
   * @param {string} currentRefreshHashed
   */
  async wipeFamilyTokens(familyId, userId, currentRefreshHashed) {
    await this.redis.pipeline([
      { cmd: 'del', args: [AuthRedisKeyScheme.family(familyId)] },
      { cmd: 'del', args: [AuthRedisKeyScheme.refresh(currentRefreshHashed)] },
      { cmd: 'del', args: [AuthRedisKeyScheme.access(userId)] },
    ]);
  }
}

module.exports = AuthTokenStore;
