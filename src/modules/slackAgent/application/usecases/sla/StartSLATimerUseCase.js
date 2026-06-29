'use strict';

class StartSLATimerUseCase {
  constructor({ slaRepository }) {
    this.slaRepository = slaRepository;
  }

  async execute(command) {
    return this.slaRepository.save(command);
  }
}

module.exports = StartSLATimerUseCase;
