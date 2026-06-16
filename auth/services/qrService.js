'use strict';

const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { getRedis } = require('../../config/redisClient');
const User = require('../models/user');
const logger = require('../../utils/logger');

const QR_TTL_SECONDS = 10 * 60; // 10 minutes

// ─── Redis key builders ───────────────────────────────────────────────────────
//
//  qr:session:<sessionId>         → userId          (pending session)
//  qr:scanned:<sessionId>         → "1"             (scan confirmed flag)
//  qr:phone:<phoneNumber>         → userId          (duplicate-phone guard)
//

const qrKeys = {
  session: (id) => `qr:session:${id}`,
  scanned: (id) => `qr:scanned:${id}`,
  phone: (phone) => `qr:phone:${phone}`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDeepLink(sessionId) {
  const base = process.env.MOBILE_DEEP_LINK_BASE || 'myapp://auth/verify-qr';
  return `${base}?sessionId=${sessionId}`;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new QR session for the given user and store it in Redis.
 * The MongoDB QrSession collection is no longer used.
 *
 * @param {string|ObjectId} userId
 * @returns {{ sessionId, qrDataUrl, expiresAt }}
 */
async function createQrSession(userId) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
  const redis = await getRedis();

  // Store pending session in Redis with exact 10-min TTL
  await redis.set(qrKeys.session(sessionId), userId.toString(), { EX: QR_TTL_SECONDS });

  const deepLink = buildDeepLink(sessionId);
  const qrDataUrl = await QRCode.toDataURL(deepLink, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
  });

  logger.info('QR session created (Redis)', { sessionId, userId });
  return { sessionId, qrDataUrl, expiresAt };
}

// ─── Scan (called by mobile app) ──────────────────────────────────────────────

/**
 * Mark a QR session as scanned, validate it, activate the user account,
 * and persist phone + device info to MongoDB.
 *
 * All session state lives in Redis; only the permanent phone/device data
 * is written to MongoDB.
 *
 * @param {{ sessionId, deviceInfo, phoneNumber?, countryCode? }}
 */
async function markQrScanned({ sessionId, deviceInfo, phoneNumber, countryCode }) {
  const redis = await getRedis();

  // 1. Check session exists (Redis handles TTL — if key is gone it's expired)
  const userId = await redis.get(qrKeys.session(sessionId));
  if (!userId) {
    throw new Error('QR session not found or expired');
  }

  // 2. Idempotency — reject if already scanned
  const alreadyScanned = await redis.get(qrKeys.scanned(sessionId));
  if (alreadyScanned) {
    throw new Error('QR session already used');
  }

  // 3. Phone uniqueness check — one phone per account
  if (phoneNumber) {
    const existingOwner = await redis.get(qrKeys.phone(phoneNumber));
    if (existingOwner && existingOwner !== userId) {
      logger.warn('Duplicate phone detected at QR scan', {
        phoneNumber,
        existingOwner,
        newUserId: userId,
      });
      throw new Error('This phone number is already linked to another account.');
    }

    // Persist phone → userId mapping permanently (no TTL — it's a permanent uniqueness guard)
    // We use the MongoDB user document as ground truth; Redis is a fast cache for lookup.
    // Check MongoDB too in case Redis was flushed
    const existingInDb = await User.findOne({ 'phone.phoneNumber': phoneNumber });
    if (existingInDb && existingInDb._id.toString() !== userId) {
      throw new Error('This phone number is already linked to another account.');
    }
  }

  // 4. Atomically mark as scanned (EX matches original session TTL so it auto-cleans)
  await redis.set(qrKeys.scanned(sessionId), '1', { EX: QR_TTL_SECONDS });

  // 5. Persist phone + device info to MongoDB and activate the account
  const updateFields = {
    isActive: true,
    pendingQr: { sessionId: null, expiresAt: null },
    'phone.isVerified': true,
    'phone.verifiedAt': new Date(),
    'phone.deviceInfo': deviceInfo,
  };
  if (phoneNumber) {
    updateFields['phone.phoneNumber'] = phoneNumber;
    updateFields['phone.countryCode'] = countryCode || null;
  }

  const user = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });
  if (!user) {
    throw new Error('User not found for QR session');
  }

  // 6. Store phone in Redis for fast duplicate-check on future registrations
  if (phoneNumber) {
    await redis.set(qrKeys.phone(phoneNumber), userId, { EX: 365 * 24 * 60 * 60 }); // 1-year cache
  }

  // 7. Clean up the session key now that it's been used
  await redis.del(qrKeys.session(sessionId));

  logger.info('QR verified — account activated', { sessionId, userId, phoneNumber });
}

// ─── Poll (called by web client) ──────────────────────────────────────────────

/**
 * Check whether a QR session has been scanned yet.
 * Pure Redis lookup — no MongoDB needed.
 *
 * @param {string} sessionId
 * @returns {{ status: 'pending' | 'scanned' | 'expired' }}
 */
async function pollQrStatus(sessionId) {
  const redis = await getRedis();

  // Check scanned flag first (fastest path for completed verifications)
  const scanned = await redis.get(qrKeys.scanned(sessionId));
  if (scanned) {
    return { status: 'scanned' };
  }

  // Check if pending session still exists
  const pending = await redis.get(qrKeys.session(sessionId));
  if (!pending) {
    return { status: 'expired' };
  }

  return { status: 'pending' };
}

module.exports = { createQrSession, markQrScanned, pollQrStatus };
