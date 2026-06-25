'use strict';

class PollVerificationUseCase {
  constructor({ verificationService }) {
    this.verificationService = verificationService;
  }

  async execute(verificationType, sessionId) {
    return this.verificationService.pollStatus(verificationType, sessionId);
  }
}

module.exports = PollVerificationUseCase;
