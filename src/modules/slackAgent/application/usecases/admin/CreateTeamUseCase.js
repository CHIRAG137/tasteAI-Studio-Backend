'use strict';

class CreateTeamUseCase {
  constructor({ teamRepository }) {
    this.teamRepository = teamRepository;
  }

  async execute(command) {
    return this.teamRepository.save(command);
  }
}

module.exports = CreateTeamUseCase;
