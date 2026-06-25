'use strict';

class VerifyVerificationUseCase {
  constructor({ verificationService }) {
    this.verificationService = verificationService;
  }

  async execute(verificationType, command) {
    await this.verificationService.verify(verificationType, command);
  }
}

module.exports = VerifyVerificationUseCase;
