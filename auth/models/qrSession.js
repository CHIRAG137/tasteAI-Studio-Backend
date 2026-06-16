'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * QrSession — ephemeral document created when a new registration starts.
 *
 * Lifecycle:
 *   pending  → user sees QR on web
 *   scanned  → mobile app hits /verify-qr with sessionId
 *   expired  → TTL index removes after 10 min
 */
const QrSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true,
    },

    // userId is set as soon as the registration record is created (before QR scan)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'scanned'],
      default: 'pending',
    },

    // Mobile device info captured at scan time
    deviceInfo: {
      userAgent: { type: String },
      platform: { type: String },
      model: { type: String },
      os: { type: String },
      ip: { type: String },
    },

    // Optional: phone number collected from mobile scan
    phoneNumber: { type: String },
    countryCode: { type: String },

    // Scanned timestamp
    scannedAt: { type: Date },

    // TTL field — MongoDB removes doc automatically after 10 minutes of expiry
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 min
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('QrSession', QrSessionSchema);
