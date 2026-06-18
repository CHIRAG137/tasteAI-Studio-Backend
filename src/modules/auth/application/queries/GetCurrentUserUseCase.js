'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');
const AuthResponseMapper = require('../mapper/AuthResponseMapper');
const UserNotFoundException = require('../../domain/exceptions/UserNotFoundException');

/**
 * Query: returns the authenticated user's public profile.
 * Separated from commands as it has no side effects (CQRS).
 */
class GetCurrentUserUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/repositories/IUserRepository')} deps.userRepository
   */
  constructor({ userRepository }) {
    super();
    this.userRepository = userRepository;
  }

  async execute(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    return AuthResponseMapper.profile(user);
  }
}

module.exports = GetCurrentUserUseCase;
