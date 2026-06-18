'use strict';

class IQrService {
  async createSession(userId) {
    throw new Error('Not Implemented');
  }

  async markScanned({ sessionId, deviceInfo, phoneNumber, countryCode }) {
    throw new Error('Not Implemented');
  }

  async pollStatus(sessionId) {
    throw new Error('Not Implemented');
  }
}

module.exports = IQrService;
