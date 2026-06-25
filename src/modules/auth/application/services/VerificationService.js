'use strict';

class VerificationService {
  constructor({ factory, defaultType }) {
    this._factory = factory;
    this._defaultType = defaultType;
  }

  async createVerification(userId, type) {
    return this._factory.get(type || this._defaultType).createVerification(userId);
  }

  async verify(type, command) {
    await this._factory.get(type).verify(command);
  }

  async pollStatus(type, sessionId) {
    return this._factory.get(type).pollStatus(sessionId);
  }

  getDefaultType() {
    return this._defaultType;
  }
}

module.exports = VerificationService;
