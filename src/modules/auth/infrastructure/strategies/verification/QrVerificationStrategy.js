'use strict';

const VerificationStrategy = require('./VerificationStrategy');

class QrVerificationStrategy extends VerificationStrategy {
  constructor(qrService) {
    super();
    this.qrService = qrService;
  }

  get type() {
    return 'qr';
  }

  async createVerification(userId) {
    return this.qrService.createSession(userId);
  }

  async verify(command) {
    await this.qrService.markScanned(command);
  }

  async pollStatus(sessionId) {
    return this.qrService.pollStatus(sessionId);
  }
}

module.exports = QrVerificationStrategy;
