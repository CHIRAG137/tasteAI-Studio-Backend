'use strict';

/**
 * @deprecated
 * This file is a **legacy compatibility shim**.
 *
 * All auth token and Redis session logic has been moved into the auth module:
 *   JWT crypto     → src/modules/auth/infrastructure/token/JwtSigner.js
 *   Redis sessions → src/modules/auth/infrastructure/token/AuthTokenStore.js
 *   Redis keys     → src/modules/auth/infrastructure/redis/AuthRedisKeyScheme.js
 *
 * The only symbol still exported here is `isExpired()`, used by:
 *   - middlewares/authMiddleware.js
 *   - middlewares/humanAgentAuthMiddleware.js
 *
 * Do NOT add new consumers of this file.
 * Migrate those two middlewares to remove this shim once they are refactored.
 */

/**
 * Returns true if the given date is in the past (or null/undefined).
 * Used by legacy middleware to check database-stored token expiry timestamps.
 *
 * @param {Date | string | null | undefined} date
 * @returns {boolean}
 */
function isExpired(date) {
  if (!date) return true;
  return new Date() > new Date(date);
}

// ── Legacy re-exports for existing non-src/ code ─────────────────────────────
// These are kept to avoid a mass-update of all callers at once.
// Mark them as deprecated; remove when all callers are migrated.

/**
 * @deprecated Use src/modules/auth/infrastructure/token/JwtSigner instead
 */
function createAccessToken() {
  throw new Error(
    '[tokenUtils] createAccessToken() is deprecated. Use JwtSigner.signAccessToken()',
  );
}

/**
 * @deprecated Use src/modules/auth/infrastructure/token/JwtSigner instead
 */
function verifyAccessToken() {
  throw new Error(
    '[tokenUtils] verifyAccessToken() is deprecated. Use JwtSigner.verifyAccessToken()',
  );
}

/**
 * @deprecated Use src/modules/auth/infrastructure/token/AuthTokenStore instead
 */
function buildAndStoreTokenPair() {
  throw new Error(
    '[tokenUtils] buildAndStoreTokenPair() is deprecated. Use JwtTokenService.issue()',
  );
}

module.exports = {
  // ✅ Still active — used by legacy middlewares
  isExpired,

  // ❌ Deprecated — throw to surface accidental new usages immediately
  createAccessToken,
  verifyAccessToken,
  buildAndStoreTokenPair,
};
