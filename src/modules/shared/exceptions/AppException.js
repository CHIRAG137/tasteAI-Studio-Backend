'use strict';

/**
 * Base class for all application-level, operational exceptions.
 *
 * Operational errors are predictable, user-facing errors (wrong password, not found, etc.).
 * Non-operational errors (isOperational=false) are programming bugs and should crash / alert.
 *
 * The `statusCode` is used by the global error handler to set the HTTP response status.
 * The `code` is a machine-readable error identifier, useful for API consumers.
 */
class AppException extends Error {
  /**
   * @param {object} params
   * @param {string} params.message       - Human-readable error message
   * @param {string} params.code          - Machine-readable error code (e.g. 'NOT_FOUND')
   * @param {number} params.statusCode    - HTTP status code (e.g. 404)
   * @param {boolean} [params.isOperational=true] - true = known/expected error; false = bug
   */
  constructor({ message, code, statusCode, isOperational = true }) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = AppException;
