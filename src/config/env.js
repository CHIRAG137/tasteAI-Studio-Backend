'use strict';

/**
 * Centralised environment variable access.
 *
 * ALL modules must import config values from here instead of reading
 * process.env directly. This ensures:
 *   1. A single, auditable source of truth for all env vars
 *   2. Type coercion (string → number/boolean) in one place
 *   3. Fail-fast startup via validateEnv()
 *
 * Call `validateEnv()` once at application startup before listening.
 *
 * @example
 * const { env } = require('./config/env');
 * const secret = env.JWT_ACCESS_SECRET;
 */

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // ── JWT ────────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // ── Google OAuth ───────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

  // ── Auth0 ─────────────────────────────────────────────────────────────────
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,

  // ── Data stores ───────────────────────────────────────────────────────────
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI,

  // ── QR / Deep link ────────────────────────────────────────────────────────
  MOBILE_DEEP_LINK_BASE:
    process.env.MOBILE_DEEP_LINK_BASE || 'http://localhost:5000/auth/user/verify-qr',
  QR_TTL_SECONDS: parseInt(process.env.QR_TTL_SECONDS || '600', 10),

  // ── Rate limiting ─────────────────────────────────────────────────────────
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000),
    10,
  ),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  QR_RATE_LIMIT_WINDOW_MS: parseInt(process.env.QR_RATE_LIMIT_WINDOW_MS || String(60 * 1000), 10),
  QR_RATE_LIMIT_MAX: parseInt(process.env.QR_RATE_LIMIT_MAX || '60', 10),
});

/**
 * List of environment variables that MUST be present at startup.
 * Add any new required vars here.
 */
const REQUIRED_VARS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

/**
 * Validates that all required environment variables are set.
 * Throws a descriptive error at startup so the app fails fast
 * instead of silently misbehaving in production.
 *
 * @throws {Error} if any required variables are missing
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[ENV] Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file or deployment configuration.',
    );
  }
}

module.exports = { env, validateEnv };
