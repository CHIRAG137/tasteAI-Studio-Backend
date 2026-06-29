'use strict';

class ToggleSkillUseCase {
  constructor({ skillRepository }) {
    this.skillRepository = skillRepository;
  }

  async execute(command) {
    return this.skillRepository.save(command);
  }
}

module.exports = ToggleSkillUseCase;
