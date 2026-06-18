'use strict';

const ApiResponse = require('../response/ApiResponse');
const logger = require('../logging');

/**
 * Global error-handling middleware.
 *
 * Must be the LAST middleware registered in the Express app (after all routes).
 *
 * Behaviour:
 * - Operational errors (AppException subclasses: isOperational=true) are mapped to
 *   their defined HTTP statusCode with the original message.
 * - Unknown / programming errors (isOperational=false or plain Error) always
 *   respond with 500 and a generic message to avoid leaking internals.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */

module.exports = function globalErrorHandler(err, req, res, _next) {
  const isOperational = Boolean(err.isOperational);

  if (isOperational) {
    logger.warn('Operational error', {
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  return ApiResponse.fromError(res, err);
};
