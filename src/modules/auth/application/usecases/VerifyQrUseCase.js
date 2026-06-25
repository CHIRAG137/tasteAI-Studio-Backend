'use strict';

class VerifyQrUseCase {
  constructor({ qrService }) {
    this.qrService = qrService;
  }

  async execute(command) {
    await this.qrService.markScanned({
      sessionId: command.sessionId,
      deviceInfo: command.deviceInfo,
      phoneNumber: command.phoneNumber,
      countryCode: command.countryCode,
    });
  }
}

module.exports = VerifyQrUseCase;
