'use strict';

/**
 * Wraps an async Express route handler and automatically forwards
 * any rejected Promise to next(), eliminating boilerplate try/catch in controllers.
 *
 * @param {Function} handler - Async (req, res, next) => Promise
 * @returns {Function} - Standard Express middleware
 *
 * @example
 * router.get('/users', asyncHandler(controller.list));
 */
module.exports = function asyncHandler(handler) {
  return function (req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};
