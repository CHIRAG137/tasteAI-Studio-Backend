const mongoose = require('mongoose');

const userSchemaV2 = new mongoose.Schema(
  {
    // authenticated user email address
    email: { type: String, required: true, unique: true },

    // authenticated user password
    password: { type: String },

    // authenticated user name
    name: { type: String },

    // authenticated user google Id(if preferred method of login is google login)
    googleId: { type: String },

    // Auth0 user id (sub claim) when using Auth0 Universal Login
    auth0Id: { type: String, sparse: true, unique: true },

    // auth token for bot dashboard
    authToken: { type: String, default: null },

    // auth token expiry timestamp
    authTokenExpiresAt: { type: Date, default: null },

    // last login metadata for the user
    lastLogin: {
      method: { type: String, enum: ['email_password', 'google', 'auth0'], default: null },
      ip: { type: String, default: null },
      device: { type: String, default: null },
      deviceId: { type: String, default: null },
      at: { type: Date, default: null },
    },

    // timestamp of when user last logged out
    lastLogoutAt: { type: Date },

    // flag to check if user is active
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('UserV2', userSchemaV2);
