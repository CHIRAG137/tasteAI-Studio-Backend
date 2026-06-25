'use strict';

const { AppException } = require('../../../../shared/exceptions');

class AuthStrategyFactory {
  constructor() {
    this._strategies = new Map();
  }

  register(strategy) {
    this._strategies.set(strategy.getType(), strategy);
  }

  get(type) {
    const strategy = this._strategies.get(type);
    if (!strategy) {
      throw new AppException({
        message: `Unsupported authentication strategy: "${type}"`,
        code: 'UNSUPPORTED_AUTH_STRATEGY',
        statusCode: 400,
      });
    }
    return strategy;
  }

  has(type) {
    return this._strategies.has(type);
  }
}

module.exports = AuthStrategyFactory;
