'use strict';

const UserModel = require('../persistence/UserModel');
const UserMapper = require('../mappers/UserMapper');
const IUserRepository = require('../../domain/contracts/IUserRepository');

class MongoUserRepository extends IUserRepository {
  async findById(id) {
    const doc = await UserModel.findById(id);
    return UserMapper.toDomain(doc);
  }

  async findByEmail(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    return UserMapper.toDomain(doc);
  }

  async findByEmailWithPassword(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    return UserMapper.toDomain(doc);
  }

  async findByOAuthOrEmail({ email, googleId, auth0Id }) {
    const doc = await UserModel.findByOAuthOrEmail({ email, googleId, auth0Id });
    return UserMapper.toDomain(doc);
  }

  async findByPhone(phoneNumber) {
    const doc = await UserModel.findOne({ 'phone.phoneNumber': phoneNumber });
    return UserMapper.toDomain(doc);
  }

  async create(user) {
    const created = await UserModel.create(UserMapper.toPersistence(user));
    return UserMapper.toDomain(created);
  }

  async update(id, payload) {
    const updated = await UserModel.findByIdAndUpdate(id, payload, { new: true });
    return UserMapper.toDomain(updated);
  }

  async delete(id) {
    await UserModel.findByIdAndDelete(id);
  }
}

module.exports = MongoUserRepository;
