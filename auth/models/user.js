'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const LastLoginSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['email_password', 'google', 'auth0'], default: null },
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
    hostedDomain: { type: String },
    rawProfile: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const Auth0ProfileSchema = new mongoose.Schema(
  {
    auth0Id: { type: String },
    email: { type: String },
    emailVerified: { type: Boolean, default: false },
    name: { type: String },
    nickname: { type: String },
    picture: { type: String },
    locale: { type: String },
    updatedAt: { type: String },
    connection: { type: String },
    provider: { type: String },
    rawProfile: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false },
);

const PhoneSchema = new mongoose.Schema(
  {
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    phoneNumber: { type: String, default: null },
    countryCode: { type: String, default: null },
    deviceInfo: {
      userAgent: { type: String, default: null },
      platform: { type: String, default: null },
      model: { type: String, default: null },
      os: { type: String, default: null },
      ip: { type: String, default: null },
    },
  },
  { _id: false },
);

// Main schema

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, trim: true },
    avatarUrl: { type: String },
    password: { type: String, select: false },
    googleId: { type: String, sparse: true, index: true },
    auth0Id: { type: String, sparse: true, index: true },
    googleProfile: { type: GoogleProfileSchema, default: null },
    auth0Profile: { type: Auth0ProfileSchema, default: null },
    authMethods: {
      type: [String],
      enum: ['email_password', 'google', 'auth0'],
      default: [],
    },
    refreshTokenFamily: { type: String, default: null },
    phone: { type: PhoneSchema, default: () => ({}) },
    pendingQr: {
      sessionId: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    lastLogin: { type: LastLoginSchema, default: null },
    lastLogoutAt: { type: Date },
    isActive: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        delete ret.password;
        delete ret.refreshTokenFamily;
        delete ret.pendingQr;
        return ret;
      },
    },
  },
);

UserSchema.index({ 'phone.phoneNumber': 1 }, { sparse: true });

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

UserSchema.methods.verifyPassword = async function (plaintext) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(plaintext, this.password);
};

module.exports = mongoose.model('User', UserSchema);
