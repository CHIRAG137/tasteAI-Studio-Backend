'use strict';

/**
 * Interface representing User repository.
 * @interface
 */
class IUserRepository {
  async findById(id) {
    throw new Error('Not Implemented');
  }

  async findByEmail(email) {
    throw new Error('Not Implemented');
  }

  async findByEmailWithPassword(email) {
    throw new Error('Not Implemented');
  }

  async findByOAuthOrEmail({ email, googleId, auth0Id }) {
    throw new Error('Not Implemented');
  }

  async findByPhone(phoneNumber) {
    throw new Error('Not Implemented');
  }

  async create(user) {
    throw new Error('Not Implemented');
  }

  async update(id, payload) {
    throw new Error('Not Implemented');
  }

  async delete(id) {
    throw new Error('Not Implemented');
  }
}

module.exports = IUserRepository;
