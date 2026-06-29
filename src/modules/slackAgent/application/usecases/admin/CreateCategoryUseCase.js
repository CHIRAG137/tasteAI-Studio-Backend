'use strict';

class CreateCategoryUseCase {
  constructor({ categoryRepository }) {
    this.categoryRepository = categoryRepository;
  }

  async execute(command) {
    return this.categoryRepository.save(command);
  }
}

module.exports = CreateCategoryUseCase;
