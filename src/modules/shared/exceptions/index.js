'use strict';

/**
 * Barrel export for all shared exceptions.
 * Consumers can import from a single path.
 *
 * @example
 * const { AppException, NotFoundException } = require('../shared/exceptions');
 */
module.exports = {
  AppException: require('./AppException'),
  NotFoundException: require('./NotFoundException'),
  UnauthorizedException: require('./UnauthorizedException'),
  ValidationException: require('./ValidationException'),
};
