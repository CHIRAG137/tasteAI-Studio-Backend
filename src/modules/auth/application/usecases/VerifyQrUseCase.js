'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');

/**
 * Marks a QR session as scanned, activating the user's account.
 */
class VerifyQrUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/services/IQrService')} deps.qrService
   */
  constructor({ qrService }) {
    super();
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
