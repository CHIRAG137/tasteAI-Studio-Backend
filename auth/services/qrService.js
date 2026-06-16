'use strict';

const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const QrSession = require('../models/qrSession');
const User = require('../models/user');
const logger = require('../../utils/logger');

const QR_TTL_SECONDS = 10 * 60; // 10 minutes

function buildDeepLink(sessionId) {
  const base = process.env.MOBILE_DEEP_LINK_BASE || 'http://localhost:5000/api/auth/user/verify-qr';
  return `${base}?sessionId=${sessionId}`;
}

/**
 * Create a new QR session for the given user.
 * Returns the sessionId and a base64 data-URL of the QR image.
 *
 * @param {string} userId - MongoDB ObjectId string
 * @returns {{ sessionId: string, qrDataUrl: string, expiresAt: Date }}
 */
async function createQrSession(userId) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);

  await QrSession.create({ sessionId, userId, expiresAt });

  // The QR encodes a deep-link the mobile app opens
  const deepLink = buildDeepLink(sessionId);
  const qrDataUrl = await QRCode.toDataURL(deepLink, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
  });

  logger.info('QR session created', { sessionId, userId });
  return { sessionId, qrDataUrl, expiresAt };
}

/**
 * Mobile scans the QR and calls this.
 * Marks the session as scanned, stores device info, updates the User.
 *
 * @param {object} params
 * @param {string} params.sessionId
 * @param {object} params.deviceInfo   - { userAgent, platform, model, os, ip }
 * @param {string} [params.phoneNumber] - E.164 format, optional
 * @param {string} [params.countryCode]
 * @returns {Promise<void>}
 */
async function markQrScanned({ sessionId, deviceInfo, phoneNumber, countryCode }) {
  const session = await QrSession.findOne({ sessionId, status: 'pending' });

  if (!session) {
    throw new Error('QR session not found or already used');
  }

  if (session.expiresAt < new Date()) {
    throw new Error('QR session expired');
  }

  // Prevent the same phone from verifying multiple accounts
  if (phoneNumber) {
    const existingWithPhone = await User.findOne({
      'phone.phoneNumber': phoneNumber,
    });
    if (existingWithPhone && existingWithPhone._id.toString() !== session.userId.toString()) {
      logger.warn('Duplicate phone number detected during QR verification', {
        phoneNumber,
        existingUserId: existingWithPhone._id,
        newUserId: session.userId,
      });
      throw new Error(
        'This phone number is already associated with another account. Each phone number may only be used once.',
      );
    }
  }

  // Update QrSession
  session.status = 'scanned';
  session.scannedAt = new Date();
  session.deviceInfo = deviceInfo;
  if (phoneNumber) {
    session.phoneNumber = phoneNumber;
    session.countryCode = countryCode;
  }
  await session.save();

  // Update User
  const user = await User.findById(session.userId);
  if (!user) {
    throw new Error('User not found for QR session');
  }

  user.phone = {
    isVerified: true,
    verifiedAt: new Date(),
    phoneNumber: phoneNumber || null,
    countryCode: countryCode || null,
    deviceInfo,
  };
  user.isActive = true; // Activate account after successful verification
  user.pendingQr = { sessionId: null, expiresAt: null };
  await user.save();

  logger.info('QR session verified — account activated', {
    sessionId,
    userId: session.userId,
    phoneNumber,
  });
}

/**
 * Poll endpoint — web client long-polls this to know when the mobile scanned.
 * Returns { status: 'pending' | 'scanned' | 'expired' }
 *
 * @param {string} sessionId
 * @returns {Promise<{ status: string }>}
 */
async function pollQrStatus(sessionId) {
  const session = await QrSession.findOne({ sessionId });

  if (!session) {
    return { status: 'expired' };
  }
  if (session.expiresAt < new Date()) {
    return { status: 'expired' };
  }
  return { status: session.status };
}

module.exports = { createQrSession, markQrScanned, pollQrStatus };
