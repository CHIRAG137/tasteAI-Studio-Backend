'use strict';

class GetSLAUseCase {
  constructor({ slaRepository }) {
    this.slaRepository = slaRepository;
  }

  async execute(slaId) {
    return this.slaRepository.findById(slaId);
  }
}

module.exports = GetSLAUseCase;
