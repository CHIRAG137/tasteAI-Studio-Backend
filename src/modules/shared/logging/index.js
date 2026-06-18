'use strict';

const WinstonLogger = require('./WinstonLogger');

/**
 * Application-wide logger singleton.
 * All modules should import the logger from this path to share a single instance.
 *
 * @example
 * const logger = require('../shared/logging');
 * logger.info('User created', { userId });
 */
module.exports = new WinstonLogger();
