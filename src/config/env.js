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

  // ── Auth integration mode ───────────────────────────────────────────────────
  // 'embedded' → auth module mounted in-process (local dev / monolith)
  // 'remote'   → traffic proxied to an independently deployed auth service
  AUTH_MODE: (process.env.AUTH_MODE || 'embedded').toLowerCase(),
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || null,
  AUTH_PORT: parseInt(process.env.AUTH_PORT || '5001', 10),
  AUTH_CORS_ORIGINS: (process.env.AUTH_CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // ── JWT ────────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  JWT_ISSUER: process.env.JWT_ISSUER || 'auth-service',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'app-client',

  // ── Google OAuth ───────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

  // ── Auth0 ─────────────────────────────────────────────────────────────────
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,

  // ── Data stores ───────────────────────────────────────────────────────────
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || null,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || null,
  REDIS_TLS: process.env.REDIS_TLS === 'true',
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

  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || null,
});

/**
 * List of environment variables that MUST always be present at startup,
 * regardless of mode.
 */
const REQUIRED_VARS = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

/**
 * Conditional validators: each runs against the resolved `env` object
 * and pushes an error message if its condition fails. Keeps validateEnv()
 * itself simple and lets us add new conditional rules without touching
 * its control flow (Open/Closed).
 */
const CONDITIONAL_VALIDATORS = [
  () => {
    if (!['embedded', 'remote'].includes(env.AUTH_MODE)) {
      return `AUTH_MODE must be "embedded" or "remote", got "${env.AUTH_MODE}"`;
    }
    return null;
  },
  () => {
    if (env.AUTH_MODE === 'remote' && !env.AUTH_SERVICE_URL) {
      return 'AUTH_SERVICE_URL is required when AUTH_MODE=remote';
    }
    return null;
  },
];

/**
 * Validates that all required environment variables are set and that
 * conditional invariants (e.g. AUTH_MODE-dependent requirements) hold.
 * Throws a descriptive error at startup so the app fails fast
 * instead of silently misbehaving in production.
 *
 * @throws {Error} if any required variables are missing or invalid
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !env[key]);
  const conditionalErrors = CONDITIONAL_VALIDATORS.map((check) => check()).filter(Boolean);

  const allErrors = [
    ...missing.map((key) => `Missing required environment variable: ${key}`),
    ...conditionalErrors,
  ];

  if (allErrors.length > 0) {
    throw new Error(
      `[ENV] Validation failed:\n  - ${allErrors.join('\n  - ')}\n` +
        'Please check your .env file or deployment configuration.',
    );
  }
}

module.exports = { env, validateEnv };
