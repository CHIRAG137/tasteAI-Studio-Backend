'use strict';

class CreateTagUseCase {
  constructor({ tagRepository }) {
    this.tagRepository = tagRepository;
  }

  async execute(command) {
    return this.tagRepository.save(command);
  }
}

module.exports = CreateTagUseCase;
