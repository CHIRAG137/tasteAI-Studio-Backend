'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getRedis } = require('../config/redisClient');

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_EXPIRY_S = 15 * 60; // 15 min in seconds (Redis TTL)
const REFRESH_TOKEN_EXPIRY_S = 30 * 24 * 60 * 60; // 30 days in seconds (Redis TTL)

// ─── Redis key builders ───────────────────────────────────────────────────────
//
//  access:<userId>          → raw access token  (single-session enforcement)
//  refresh:<hashedToken>    → userId            (token → user lookup)
//  family:<familyId>        → userId            (reuse detection / breach wipe)
//

const keys = {
  access: (userId) => `access:${userId}`,
  refresh: (hashed) => `refresh:${hashed}`,
  family: (familyId) => `family:${familyId}`,
};

// ─── Access token ─────────────────────────────────────────────────────────────

/**
 * Create a signed JWT access token.
 */
function createAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, type: 'access' },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: process.env.JWT_ISSUER || 'auth-service',
      audience: process.env.JWT_AUDIENCE || 'app-client',
    },
  );
}

/**
 * Verify and decode a JWT access token. Throws on failure.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: process.env.JWT_ISSUER || 'auth-service',
    audience: process.env.JWT_AUDIENCE || 'app-client',
  });
}

// ─── Refresh token ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure opaque refresh token.
 * @returns {{ raw: string, hashed: string, family: string }}
 */
function createRefreshToken() {
  const raw = crypto.randomBytes(64).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  const family = crypto.randomBytes(16).toString('hex');
  return { raw, hashed, family };
}

/**
 * Hash a raw refresh token for Redis key lookup.
 */
function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ─── Redis session store ──────────────────────────────────────────────────────

/**
 * Persist a token pair to Redis.
 * - access:<userId>       = raw access token   TTL 15 min
 * - refresh:<hash>        = userId             TTL 30 days
 * - family:<familyId>     = userId             TTL 30 days
 *
 * Uses a pipeline so all three writes are one round-trip.
 */
async function storeTokenPair({ userId, accessToken, refreshHashed, family }) {
  const redis = await getRedis();
  const pipe = redis.multi();

  pipe.set(keys.access(userId), accessToken, { EX: ACCESS_TOKEN_EXPIRY_S });
  pipe.set(keys.refresh(refreshHashed), userId.toString(), { EX: REFRESH_TOKEN_EXPIRY_S });
  pipe.set(keys.family(family), userId.toString(), { EX: REFRESH_TOKEN_EXPIRY_S });

  await pipe.exec();
}

/**
 * Validate an access token from Redis.
 * Returns the userId if the stored token matches, otherwise null.
 */
async function validateAccessToken(userId, token) {
  const redis = await getRedis();
  const stored = await redis.get(keys.access(userId));
  return stored === token ? userId : null;
}

/**
 * Look up the userId for a hashed refresh token.
 * Returns userId string or null.
 */
async function lookupRefreshToken(hashed) {
  const redis = await getRedis();
  return redis.get(keys.refresh(hashed)); // returns userId or null
}

/**
 * Look up the userId for a token family id.
 * Returns userId string or null.
 */
async function lookupFamily(familyId) {
  const redis = await getRedis();
  return redis.get(keys.family(familyId));
}

/**
 * Delete a specific refresh token entry (rotation — old token invalidated).
 */
async function deleteRefreshToken(hashed) {
  const redis = await getRedis();
  await redis.del(keys.refresh(hashed));
}

/**
 * Wipe the entire token family — forces all sessions for this user to re-login.
 * Called when refresh token reuse is detected (possible theft).
 *
 * @param {string} familyId
 * @param {string} userId
 * @param {string} currentRefreshHashed - the token that was just attempted
 */
async function wipeFamilyTokens(familyId, userId, currentRefreshHashed) {
  const redis = await getRedis();
  const pipe = redis.multi();

  pipe.del(keys.family(familyId));
  pipe.del(keys.refresh(currentRefreshHashed));
  pipe.del(keys.access(userId));

  await pipe.exec();
}

/**
 * Clear all session keys for a user (logout).
 * Refresh token hash is passed so that key can also be removed.
 *
 * @param {string} userId
 * @param {string} [refreshHashed]
 * @param {string} [family]
 */
async function clearSession(userId, refreshHashed, family) {
  const redis = await getRedis();
  const pipe = redis.multi();

  pipe.del(keys.access(userId));
  if (refreshHashed) {
    pipe.del(keys.refresh(refreshHashed));
  }
  if (family) {
    pipe.del(keys.family(family));
  }

  await pipe.exec();
}

// ─── Full token pair builder ──────────────────────────────────────────────────

/**
 * Build + store a full token pair for a user.
 *
 * @param {object} user - Mongoose User document
 * @returns {{ accessToken: string, refreshTokenRaw: string, family: string, refreshHashed: string }}
 */
async function buildAndStoreTokenPair(user) {
  const accessToken = createAccessToken(user);
  const { raw: refreshTokenRaw, hashed: refreshHashed, family } = createRefreshToken();

  await storeTokenPair({
    userId: user._id,
    accessToken,
    refreshHashed,
    family,
  });

  return { accessToken, refreshTokenRaw, refreshHashed, family };
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

function isExpired(date) {
  if (!date) {
    return true;
  }
  return new Date() > new Date(date);
}

module.exports = {
  // JWT
  createAccessToken,
  verifyAccessToken,
  // Refresh token
  createRefreshToken,
  hashRefreshToken,
  // Redis session ops
  storeTokenPair,
  validateAccessToken,
  lookupRefreshToken,
  lookupFamily,
  deleteRefreshToken,
  wipeFamilyTokens,
  clearSession,
  // Pair builder
  buildAndStoreTokenPair,
  // Misc
  isExpired,
  // Key builders (exported for testing)
  redisKeys: keys,
};
