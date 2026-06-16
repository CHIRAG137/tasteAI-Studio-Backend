'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = '15m'; // short-lived
const REFRESH_TOKEN_EXPIRY = '30d'; // long-lived
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Create a signed JWT access token.
 * @param {object} user - Mongoose User document
 * @returns {string}
 */
function createAccessToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    type: 'access',
  };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: process.env.JWT_ISSUER || 'auth-service',
    audience: process.env.JWT_AUDIENCE || 'app-client',
  });
}

/**
 * Verify and decode a JWT access token.
 * Throws on failure — caller handles the error.
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: process.env.JWT_ISSUER || 'auth-service',
    audience: process.env.JWT_AUDIENCE || 'app-client',
  });
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure opaque refresh token.
 * Stored as a SHA-256 hash in the DB; raw value sent to the client.
 * @returns {{ raw: string, hashed: string, family: string }}
 */
function createRefreshToken() {
  const raw = crypto.randomBytes(64).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  const family = crypto.randomBytes(16).toString('hex'); // rotation family id
  return { raw, hashed, family };
}

/**
 * Hash a raw refresh token for DB comparison.
 * @param {string} raw
 * @returns {string}
 */
function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ─── Expiry helpers ───────────────────────────────────────────────────────────

function getAccessTokenExpiry() {
  return new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS);
}

function getRefreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
}

function isExpired(date) {
  if (!date) {
    return true;
  }
  return new Date() > new Date(date);
}

// ─── Token pair builder ───────────────────────────────────────────────────────

/**
 * Build a full token pair (access + refresh) for a user.
 * Returns the raw refresh token (to send to client) and the DB-ready object.
 *
 * @param {object} user - Mongoose User document
 * @returns {{
 *   accessToken: string,
 *   refreshTokenRaw: string,
 *   dbTokens: object
 * }}
 */
function buildTokenPair(user) {
  const accessToken = createAccessToken(user);
  const { raw: refreshTokenRaw, hashed: refreshTokenHashed, family } = createRefreshToken();

  const dbTokens = {
    accessToken,
    accessTokenExpiresAt: getAccessTokenExpiry(),
    refreshToken: refreshTokenHashed,
    refreshTokenExpiresAt: getRefreshTokenExpiry(),
    refreshTokenFamily: family,
  };

  return { accessToken, refreshTokenRaw, dbTokens };
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashRefreshToken,
  buildTokenPair,
  getAccessTokenExpiry,
  getRefreshTokenExpiry,
  isExpired,
};
