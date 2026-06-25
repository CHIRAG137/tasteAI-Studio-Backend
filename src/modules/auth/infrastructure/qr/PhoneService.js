'use strict';

const qrKeyScheme = require('./QrKeyScheme');
const { AppException } = require('../../../shared/exceptions');
const logger = require('../../../shared/logging');

class PhoneService {
  constructor(userRepository, redisClient) {
    this.userRepository = userRepository;
    this.redis = redisClient;
  }

  async assertNotTaken(phoneNumber, userId) {
    const cachedOwner = await this.redis.get(qrKeyScheme.phone(phoneNumber));
    if (cachedOwner && cachedOwner !== userId) {
      logger.warn('Duplicate phone detected (cache)', {
        phoneNumber,
        existingOwner: cachedOwner,
        newUserId: userId,
      });
      throw new AppException({
        message: 'This phone number is already linked to another account.',
        code: 'PHONE_ALREADY_LINKED',
        statusCode: 400,
      });
    }

    const existingUser = await this.userRepository.findByPhone(phoneNumber);
    if (existingUser && existingUser.id !== userId) {
      throw new AppException({
        message: 'This phone number is already linked to another account.',
        code: 'PHONE_ALREADY_LINKED',
        statusCode: 400,
      });
    }
  }

  async cacheMapping(phoneNumber, userId) {
    await this.redis.set(qrKeyScheme.phone(phoneNumber), userId, { EX: 365 * 24 * 60 * 60 });
  }
}

module.exports = PhoneService;
