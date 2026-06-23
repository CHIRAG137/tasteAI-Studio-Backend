'use strict';

class IAvatarRepository {
  async save(avatar) {
    throw new Error('IAvatarRepository.save() must be implemented');
  }

  async findById(id) {
    throw new Error('IAvatarRepository.findById() must be implemented');
  }
}

module.exports = IAvatarRepository;
