'use strict';

class CreateBusinessHoursUseCase {
  constructor({ businessHoursRepository }) {
    this.businessHoursRepository = businessHoursRepository;
  }

  async execute(command) {
    return this.businessHoursRepository.save(command);
  }
}

module.exports = CreateBusinessHoursUseCase;
