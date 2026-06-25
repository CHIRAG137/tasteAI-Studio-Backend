'use strict';

const ApiResponse = require('../response/ApiResponse');
const logger = require('../logging');

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
