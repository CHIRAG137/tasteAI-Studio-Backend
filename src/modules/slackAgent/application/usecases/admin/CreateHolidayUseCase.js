'use strict';

class CreateHolidayUseCase {
  constructor({ holidayRepository }) {
    this.holidayRepository = holidayRepository;
  }

  async execute(command) {
    return this.holidayRepository.save(command);
  }
}

module.exports = CreateHolidayUseCase;
