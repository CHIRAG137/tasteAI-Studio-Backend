'use strict';

const IUserRepository = require('../../domain/repositories/IUserRepository');
const UserModel = require('../../models/UserModel');
const UserMapper = require('../mappers/UserMapper');

/**
 * MongoDB/Mongoose implementation of IUserRepository interface.
 */
class MongoUserRepository extends IUserRepository {
  async findById(id) {
    const doc = await UserModel.findById(id);
    return UserMapper.toDomain(doc);
  }

  async findByEmail(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    return UserMapper.toDomain(doc);
  }

  /**
   * Returns a domain user entity with the password field populated.
   * @returns {Promise<User | null>}
   */
  async findByEmailWithPassword(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    return UserMapper.toDomain(doc);
  }

  async findByOAuthOrEmail({ email, googleId, auth0Id }) {
    const doc = await UserModel.findByOAuthOrEmail({ email, googleId, auth0Id });
    return UserMapper.toDomain(doc);
  }

  /**
   * Finds a user by their verified phone number.
   * Used by RedisQrService for duplicate phone detection.
   */
  async findByPhone(phoneNumber) {
    const doc = await UserModel.findOne({ 'phone.phoneNumber': phoneNumber });
    return UserMapper.toDomain(doc);
  }

  async create(user) {
    const created = await UserModel.create(UserMapper.toPersistence(user));
    return UserMapper.toDomain(created);
  }

  /**
   * Applies a partial update to a user document.
   * Supports both plain field updates and MongoDB operators ($set, $addToSet, etc.).
   */
  async update(id, payload) {
    const updated = await UserModel.findByIdAndUpdate(id, payload, { new: true });
    return UserMapper.toDomain(updated);
  }

  async delete(id) {
    await UserModel.findByIdAndDelete(id);
  }
}

module.exports = MongoUserRepository;
