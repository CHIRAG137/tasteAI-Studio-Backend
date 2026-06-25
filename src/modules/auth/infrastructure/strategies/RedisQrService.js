'use strict';

const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { AppException } = require('../../../shared/exceptions');
const qrKeyScheme = require('../qr/QrKeyScheme');
const { buildDeepLink } = require('../qr/QrUtils');
const { env } = require('../../../../config/env');
const logger = require('../../../shared/logging');

class RedisQrService {
  constructor(userRepository, redisClient) {
    this.userRepository = userRepository;
    this.redis = redisClient;
  }

  async createSession(userId) {
    const sessionId = uuidv4();
    const ttl = env.QR_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await this.redis.set(qrKeyScheme.session(sessionId), userId.toString(), { EX: ttl });

    const deepLink = buildDeepLink(sessionId);
    const qrDataUrl = await QRCode.toDataURL(deepLink, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });

    logger.info('QR session created', { sessionId, userId });
    return { sessionId, qrDataUrl, expiresAt };
  }

  async markScanned({ sessionId, deviceInfo, phoneNumber, countryCode }) {
    const ttl = env.QR_TTL_SECONDS;

    const userId = await this.redis.get(qrKeyScheme.session(sessionId));
    if (!userId) {
      throw new AppException({
        message: 'QR session not found or expired',
        code: 'QR_SESSION_ERROR',
        statusCode: 400,
      });
    }

    const alreadyScanned = await this.redis.get(qrKeyScheme.scanned(sessionId));
    if (alreadyScanned) {
      throw new AppException({
        message: 'QR session already used',
        code: 'QR_SESSION_ERROR',
        statusCode: 400,
      });
    }

    if (phoneNumber) {
      await this._assertPhoneNotTaken(phoneNumber, userId);
    }

    await this.redis.set(qrKeyScheme.scanned(sessionId), '1', { EX: ttl });

    const updateFields = {
      isActive: true,
      pendingQr: { sessionId: null, expiresAt: null },
      'phone.isVerified': true,
      'phone.verifiedAt': new Date(),
      'phone.deviceInfo': deviceInfo ?? null,
      ...(phoneNumber && {
        'phone.phoneNumber': phoneNumber,
        'phone.countryCode': countryCode ?? null,
      }),
    };

    const updatedUser = await this.userRepository.update(userId, updateFields);
    if (!updatedUser) {
      throw new AppException({
        message: 'User not found for QR session',
        code: 'QR_SESSION_ERROR',
        statusCode: 400,
      });
    }

    if (phoneNumber) {
      await this.redis.set(qrKeyScheme.phone(phoneNumber), userId, { EX: 365 * 24 * 60 * 60 });
    }

    await this.redis.del(qrKeyScheme.session(sessionId));
    logger.info('QR verified — account activated', { sessionId, userId, phoneNumber });
  }

  async pollStatus(sessionId) {
    const scanned = await this.redis.get(qrKeyScheme.scanned(sessionId));
    if (scanned) {
      return { status: 'scanned' };
    }

    const pending = await this.redis.get(qrKeyScheme.session(sessionId));
    if (!pending) {
      return { status: 'expired' };
    }

    return { status: 'pending' };
  }

  async _assertPhoneNotTaken(phoneNumber, userId) {
    const cachedOwner = await this.redis.get(qrKeyScheme.phone(phoneNumber));
    if (cachedOwner && cachedOwner !== userId) {
      logger.warn('Duplicate phone detected at QR scan (cache)', {
        phoneNumber,
        existingOwner: cachedOwner,
        newUserId: userId,
      });
      throw new AppException({
        message: 'This phone number is already linked to another account.',
        code: 'QR_SESSION_ERROR',
        statusCode: 400,
      });
    }

    const existingUser = await this.userRepository.findByPhone(phoneNumber);
    if (existingUser && existingUser.id !== userId) {
      throw new AppException({
        message: 'This phone number is already linked to another account.',
        code: 'QR_SESSION_ERROR',
        statusCode: 400,
      });
    }
  }
}

module.exports = RedisQrService;
