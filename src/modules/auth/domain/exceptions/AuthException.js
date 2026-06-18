'use strict';

const AppException = require('../../../shared/exceptions/AppException');

/**
 * Maps auth-specific error codes to HTTP status codes.
 * Centralised here so subclasses don't hard-code status codes themselves.
 */
const HTTP_STATUS_MAP = {
  // 401 — identity/credential failures
  INVALID_CREDENTIALS: 401,
  OAUTH_ONLY_ACCOUNT: 401,
  INVALID_REFRESH_TOKEN: 401,
  INVALID_TOKEN: 401,
  MISSING_EMAIL: 401,
  INVALID_OAUTH_TOKEN: 401,
  USER_NOT_FOUND: 401, // use 401 to prevent user-enumeration attacks

  // 403 — account state issues
  USER_INACTIVE: 403,
  USER_BANNED: 403,

  // 409 — conflict
  ACCOUNT_EXISTS: 409,

  // 400 — bad request / usage error
  QR_SESSION_ERROR: 400,
  UNSUPPORTED_PROVIDER: 400,
  AUTH_ERROR: 400,

  // 502 — upstream dependency failure
  AUTH0_PROFILE_ERROR: 502,
};

/**
 * Base class for all auth domain exceptions.
 * Extends AppException so the global error handler can map it to the correct HTTP status.
 */
class AuthException extends AppException {
  /**
   * @param {string} message - Human-readable message
   * @param {string} [code='AUTH_ERROR'] - Machine-readable error code
   */
  constructor(message, code = 'AUTH_ERROR') {
    const statusCode = HTTP_STATUS_MAP[code] ?? 400;
    super({ message, code, statusCode });
  }
}

module.exports = AuthException;
