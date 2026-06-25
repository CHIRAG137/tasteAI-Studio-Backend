'use strict';

const { AppException } = require('../../../../shared/exceptions');

class VerificationStrategyFactory {
  constructor() {
    this._strategies = new Map();
  }

  register(strategy) {
    this._strategies.set(strategy.type, strategy);
  }

  get(type) {
    const strategy = this._strategies.get(type);
    if (!strategy) {
      throw new AppException({
        message: `Unknown verification type: "${type}". Supported types: ${[...this._strategies.keys()].join(', ')}`,
        code: 'UNKNOWN_VERIFICATION_TYPE',
        statusCode: 400,
      });
    }
    return strategy;
  }

  has(type) {
    return this._strategies.has(type);
  }

  get types() {
    return [...this._strategies.keys()];
  }
}

module.exports = VerificationStrategyFactory;
