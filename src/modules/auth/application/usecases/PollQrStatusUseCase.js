'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');

/**
 * Returns the current status of a QR session: pending | scanned | expired.
 * Used by the web client to poll for mobile verification completion.
 */
class PollQrStatusUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/services/IQrService')} deps.qrService
   */
  constructor({ qrService }) {
    super();
    this.qrService = qrService;
  }

  async execute(sessionId) {
    return this.qrService.pollStatus(sessionId);
  }
}

module.exports = PollQrStatusUseCase;
