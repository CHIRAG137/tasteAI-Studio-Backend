'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const LastLoginSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['email_password', 'google', 'auth0'],
      default: null,
    },
    ip: { type: String, default: null },
    device: { type: String, default: null },
    deviceId: { type: String, default: null },
    at: { type: Date, default: null },
  },
  { _id: false },
);

const GoogleProfileSchema = new mongoose.Schema(
  {
    googleId: { type: String },
    email: { type: String },
    name: { type: String },
    givenName: { type: String },
    familyName: { type: String },
    picture: { type: String },
    locale: { type: String },
    emailVerified: { type: Boolean, default: false },
    hostedDomain: { type: String }, // hd claim — G Suite domain
    rawProfile: { type: mongoose.Schema.Types.Mixed }, // full payload stored as-is
  },
  { _id: false },
);

const Auth0ProfileSchema = new mongoose.Schema(
  {
    auth0Id: { type: String }, // sub claim
    email: { type: String },
    emailVerified: { type: Boolean, default: false },
    name: { type: String },
    nickname: { type: String },
    picture: { type: String },
    locale: { type: String },
    updatedAt: { type: String },
    connection: { type: String }, // e.g. "google-oauth2", "Username-Password-Authentication"
    provider: { type: String }, // derived from sub prefix
    rawProfile: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const PhoneVerificationSchema = new mongoose.Schema(
  {
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    phoneNumber: { type: String, default: null }, // E.164 format
    countryCode: { type: String, default: null },
    deviceInfo: {
      userAgent: { type: String, default: null },
      platform: { type: String, default: null }, // iOS / Android / web
      model: { type: String, default: null },
      os: { type: String, default: null },
      ip: { type: String, default: null },
    },
  },
  { _id: false },
);

const TokenPairSchema = new mongoose.Schema(
  {
    accessToken: { type: String, default: null },
    accessTokenExpiresAt: { type: Date, default: null },
    refreshToken: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    refreshTokenFamily: { type: String, default: null }, // for rotation + reuse detection
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true },
    avatarUrl: { type: String },

    // ── Email/password auth ───────────────────────────────────────────────
    password: { type: String, select: false }, // never returned by default

    // ── OAuth profiles (rich data saved per-provider) ─────────────────────
    googleProfile: { type: GoogleProfileSchema, default: null },
    auth0Profile: { type: Auth0ProfileSchema, default: null },

    // ── Sparse indexed IDs for fast lookup ────────────────────────────────
    googleId: { type: String, sparse: true, index: true },
    auth0Id: { type: String, sparse: true, index: true },

    // ── Auth methods used (for cross-method linking) ──────────────────────
    authMethods: {
      type: [String],
      enum: ['email_password', 'google', 'auth0'],
      default: [],
    },

    // ── Token pair (access + refresh) ─────────────────────────────────────
    tokens: { type: TokenPairSchema, default: () => ({}) },

    // ── Phone / mobile verification ───────────────────────────────────────
    phone: { type: PhoneVerificationSchema, default: () => ({}) },

    // ── Pending QR verification state (cleared after success) ─────────────
    pendingQr: {
      sessionId: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },

    // ── Last login ────────────────────────────────────────────────────────
    lastLogin: { type: LastLoginSchema, default: null },
    lastLogoutAt: { type: Date },

    // ── Account state ─────────────────────────────────────────────────────
    isActive: { type: Boolean, default: false }, // false until QR verified
    isEmailVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        delete ret.password;
        delete ret.tokens;
        delete ret.pendingQr;
        return ret;
      },
    },
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
UserSchema.index({ 'phone.phoneNumber': 1 }, { sparse: true });
UserSchema.index({ 'pendingQr.sessionId': 1 }, { sparse: true });
UserSchema.index({ 'tokens.refreshToken': 1 }, { sparse: true });

// ─── Statics ─────────────────────────────────────────────────────────────────

/**
 * Find a user by any OAuth identifier or email.
 */
UserSchema.statics.findByOAuthOrEmail = function ({ email, googleId, auth0Id }) {
  const conditions = [];
  if (email) {
    conditions.push({ email: email.toLowerCase() });
  }
  if (googleId) {
    conditions.push({ googleId });
  }
  if (auth0Id) {
    conditions.push({ auth0Id });
  }
  if (!conditions.length) {
    return null;
  }
  return this.findOne({ $or: conditions });
};

// ─── Methods ──────────────────────────────────────────────────────────────────

/**
 * Compare a plaintext password against the stored hash.
 * Must explicitly select password when querying: User.findOne(...).select('+password')
 */
UserSchema.methods.verifyPassword = async function (plaintext) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(plaintext, this.password);
};

/**
 * Check whether the access token is still valid.
 */
UserSchema.methods.isAccessTokenValid = function () {
  return this.tokens?.accessToken && new Date() < new Date(this.tokens.accessTokenExpiresAt);
};

/**
 * Check whether the refresh token is still valid.
 */
UserSchema.methods.isRefreshTokenValid = function () {
  return this.tokens?.refreshToken && new Date() < new Date(this.tokens.refreshTokenExpiresAt);
};

module.exports = mongoose.model('User', UserSchema);
