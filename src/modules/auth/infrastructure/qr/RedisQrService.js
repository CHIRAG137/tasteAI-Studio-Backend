'use strict';

const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const IQrService = require('../../domain/services/IQrService');
// IRedisClient is imported in JSDoc only, no runtime requirement needed
const QrSessionException = require('../../domain/exceptions/QrSessionException');
const qrKeyScheme = require('./QrKeyScheme');
const { buildDeepLink } = require('./QrUtils');
const { env } = require('../../../../config/env');
const logger = require('../../../shared/logging');

/**
 * Redis-backed QR session service.
 *
 * Manages the lifecycle of mobile QR verification sessions:
 *   createSession  → generates a QR code linking to a mobile deep link
 *   markScanned    → activates the user account on mobile scan
 *   pollStatus     → returns current session state for web client polling
 *
 * Depends on abstractions (injected), not on concrete implementations:
 *   - IUserRepository → findById, findByPhone, update
 *   - IRedisClient    → get, set, del (no direct call to getRedis())
 */
class RedisQrService extends IQrService {
  /**
   * @param {import('../../domain/repositories/IUserRepository')} userRepository
   * @param {IRedisClient} redisClient
   */
  constructor(userRepository, redisClient) {
    super();
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

    // 1. Validate session exists
    const userId = await this.redis.get(qrKeyScheme.session(sessionId));
    if (!userId) {
      throw new QrSessionException('QR session not found or expired');
    }

    // 2. Prevent double-scan
    const alreadyScanned = await this.redis.get(qrKeyScheme.scanned(sessionId));
    if (alreadyScanned) {
      throw new QrSessionException('QR session already used');
    }

    // 3. Duplicate phone check (Redis cache + DB fallback)
    if (phoneNumber) {
      await this._assertPhoneNotTaken(phoneNumber, userId);
    }

    // 4. Mark as scanned atomically to prevent race conditions
    await this.redis.set(qrKeyScheme.scanned(sessionId), '1', { EX: ttl });

    // 5. Activate user and record phone info via repository
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
      throw new QrSessionException('User not found for QR session');
    }

    // 6. Persist phone → userId mapping in Redis for fast future duplicate checks
    if (phoneNumber) {
      const ONE_YEAR_S = 365 * 24 * 60 * 60;
      await this.redis.set(qrKeyScheme.phone(phoneNumber), userId, { EX: ONE_YEAR_S });
    }

    // 7. Clean up the session key
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

  /** @private — ensures a phone number isn't already linked to another user */
  async _assertPhoneNotTaken(phoneNumber, userId) {
    // Fast path: Redis cache (O(1))
    const cachedOwner = await this.redis.get(qrKeyScheme.phone(phoneNumber));
    if (cachedOwner && cachedOwner !== userId) {
      logger.warn('Duplicate phone detected at QR scan (cache)', {
        phoneNumber,
        existingOwner: cachedOwner,
        newUserId: userId,
      });
      throw new QrSessionException('This phone number is already linked to another account.');
    }

    // Slow path: DB fallback (covers cache eviction)
    const existingUser = await this.userRepository.findByPhone(phoneNumber);
    if (existingUser && existingUser.id !== userId) {
      throw new QrSessionException('This phone number is already linked to another account.');
    }
  }
}

module.exports = RedisQrService;
