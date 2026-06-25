'use strict';

class VerificationStrategy {
  get type() {
    throw new Error(`${this.constructor.name}.type getter not implemented`);
  }

  async createVerification(userId) {
    throw new Error(`${this.constructor.name}.createVerification() not implemented`);
  }

  async verify(command) {
    throw new Error(`${this.constructor.name}.verify() not implemented`);
  }

  async pollStatus(sessionId) {
    throw new Error(`${this.constructor.name}.pollStatus() not implemented`);
  }
}

module.exports = VerificationStrategy;
