'use strict';

/**
 * Centralised Redis key builders for all auth token operations.
 *
 * Extracted from `utils/tokenUtils.js` into the auth domain where it belongs.
 * Keeping key formats here ensures changes require touching only one file.
 *
 * Key scheme:
 *   access:<userId>          → raw access token (single-session enforcement)
 *   refresh:<hashedToken>    → userId           (token → user lookup)
 *   family:<familyId>        → userId           (reuse detection / breach wipe)
 *
 * @type {Readonly<object>}
 */
const AuthRedisKeyScheme = Object.freeze({
  /** Maps a userId to its current raw access token. */
  access: (userId) => `access:${userId}`,

  /** Maps a hashed refresh token to its owning userId. */
  refresh: (hashed) => `refresh:${hashed}`,

  /** Maps a token family id to its owning userId. */
  family: (familyId) => `family:${familyId}`,
});

module.exports = AuthRedisKeyScheme;
