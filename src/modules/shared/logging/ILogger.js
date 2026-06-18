'use strict';

/**
 * Logger interface / contract.
 * All concrete logger implementations must satisfy this interface.
 *
 * Following the Dependency Inversion Principle — consumers depend on ILogger,
 * not on a concrete Winston/console implementation.
 */
class ILogger {
  debug(message, meta) {
    throw new Error(`${this.constructor.name}.debug() not implemented`);
  }

  info(message, meta) {
    throw new Error(`${this.constructor.name}.info() not implemented`);
  }

  warn(message, meta) {
    throw new Error(`${this.constructor.name}.warn() not implemented`);
  }

  error(message, meta) {
    throw new Error(`${this.constructor.name}.error() not implemented`);
  }
}

module.exports = ILogger;
