'use strict';

class RegisterSkillUseCase {
  constructor({ skillRepository }) {
    this.skillRepository = skillRepository;
  }

  async execute(command) {
    return this.skillRepository.save(command);
  }
}

module.exports = RegisterSkillUseCase;
