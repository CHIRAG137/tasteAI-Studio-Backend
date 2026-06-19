'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../../../../config/env');

/**
 * Pure JWT signer / verifier + opaque refresh-token generator.
 *
 * Single Responsibility: all cryptographic token operations for the auth module.
 *   - No Redis, no database, no side effects.
 *   - Reads from the central `env` config (never `process.env` directly).
 *   - Fully testable in isolation.
 *
 * Injected into: JwtTokenService
 */
class JwtSigner {
  // ── Access token TTL constants ────────────────────────────────────────────
  static ACCESS_TOKEN_EXPIRY_S = 15 * 60;         // 15 min in seconds (Redis TTL)
  static REFRESH_TOKEN_EXPIRY_S = 30 * 24 * 60 * 60; // 30 days in seconds (Redis TTL)

  /**
   * Signs and returns a JWT access token for a user.
   *
   * Payload:
   *   - sub   : userId string
   *   - type  : 'access'  (used to reject refresh tokens in auth guards)
   *
   * @param {string} userId
   * @param {string} [email]
   * @returns {string}
   */
  signAccessToken(userId, email) {
    return jwt.sign(
      { sub: userId.toString(), email: email ?? undefined, type: 'access' },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        issuer: env.JWT_ISSUER || 'auth-service',
        audience: env.JWT_AUDIENCE || 'app-client',
      },
    );
  }

  /**
   * Verifies a JWT access token.
   * Throws `JsonWebTokenError` / `TokenExpiredError` on failure.
   *
   * @param {string} token - Raw access token
   * @returns {object} Decoded JWT payload
   * @throws {Error} if token is invalid or expired
   */
  verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER || 'auth-service',
      audience: env.JWT_AUDIENCE || 'app-client',
    });
  }

  /**
   * Generates a cryptographically secure opaque refresh token.
   *
   * @returns {{ raw: string, hashed: string, family: string }}
   *   - `raw`    — the token sent to the client (never stored)
   *   - `hashed` — SHA-256 hash stored in Redis as the lookup key
   *   - `family` — rotation family id for token-reuse-detection wipe
   */
  createRefreshToken() {
    const raw = crypto.randomBytes(64).toString('hex');
    const hashed = this._sha256(raw);
    const family = crypto.randomBytes(16).toString('hex');
    return { raw, hashed, family };
  }

  /**
   * Hashes a raw refresh token for Redis key lookup.
   * Used when the raw token arrives from the client.
   *
   * @param {string} raw
   * @returns {string} SHA-256 hex digest
   */
  hashRefreshToken(raw) {
    return this._sha256(raw);
  }

  /** @private */
  _sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

module.exports = JwtSigner;
