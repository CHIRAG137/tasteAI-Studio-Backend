'use strict';

class PollQrStatusUseCase {
  constructor({ qrService }) {
    this.qrService = qrService;
  }

  async execute(sessionId) {
    return this.qrService.pollStatus(sessionId);
  }
}

module.exports = PollQrStatusUseCase;
