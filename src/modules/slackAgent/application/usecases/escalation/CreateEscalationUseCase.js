'use strict';

class CreateEscalationUseCase {
  constructor({ escalationRepository }) {
    this.escalationRepository = escalationRepository;
  }

  async execute(command) {
    return this.escalationRepository.save(command);
  }
}

module.exports = CreateEscalationUseCase;
