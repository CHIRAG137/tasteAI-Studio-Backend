'use strict';

class AuthStrategy {
  getType() {
    throw new Error(`${this.constructor.name}.getType() not implemented`);
  }

  async authenticate(command) {
    throw new Error(`${this.constructor.name}.authenticate() not implemented`);
  }

  async login(command) {
    throw new Error(`${this.constructor.name}.login() not implemented`);
  }

  async register(command) {
    throw new Error(`Registration not supported for strategy: ${this.getType()}`);
  }
}

module.exports = AuthStrategy;
