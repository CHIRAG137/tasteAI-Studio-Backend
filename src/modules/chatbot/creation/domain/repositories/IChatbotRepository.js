'use strict';

class IChatbotRepository {
  async create() {
    throw new Error('create() must be implemented');
  }

  async findById() {
    throw new Error('findById() must be implemented');
  }

  async update() {
    throw new Error('update() must be implemented');
  }
}

module.exports = IChatbotRepository;
