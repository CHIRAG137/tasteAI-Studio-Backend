'use strict';

const { NotFoundException } = require('../../../shared/exceptions');
const AuthResponseMapper = require('../mappers/AuthResponseMapper');

class GetCurrentUserUseCase {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found', 'USER_NOT_FOUND');
    }
    return AuthResponseMapper.profile(user);
  }
}

module.exports = GetCurrentUserUseCase;
