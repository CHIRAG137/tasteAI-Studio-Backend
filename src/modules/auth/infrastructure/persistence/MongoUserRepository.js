'use strict';

const IUserRepository = require('../../domain/repositories/IUserRepository');
const UserModel = require('../../models/user');
const UserMapper = require('../mappers/UserMapper');

/**
 * MongoDB/Mongoose implementation of IUserRepository.
 *
 * All Mongoose-specific logic (queries, document manipulation) lives here.
 * Callers receive domain User entities — never Mongoose documents.
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
   * Returns both a domain entity AND the raw Mongoose doc.
   * The raw doc is used by EmailPasswordAuthProvider to access the select:false password field.
   * @returns {{ domain: User | null, doc: MongooseDocument | null }}
   */
  async findByEmailWithPassword(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    return { domain: UserMapper.toDomain(doc), doc };
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
