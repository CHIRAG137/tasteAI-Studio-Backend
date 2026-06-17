'use strict';

const axios = require('axios');

const User = require('../models/user');
const { buildAndStoreTokenPair } = require('../../utils/tokenUtils');
const logger = require('../../utils/logger');
const { googleClient } = require('../config/googleOAuthClient');

const buildLastLogin = (method, meta = {}) => {
  return {
    method,
    ip: meta.ip || 'Unknown',
    device: meta.device || 'Unknown',
    deviceId: meta.deviceId || null,
    at: new Date(),
  };
};

exports.addAuthMethod = function (user, method) {
  if (!user.authMethods.includes(method)) {
    user.authMethods.push(method);
  }
};

/**
 * Issue a new token pair via Redis and save the family ID + lastLogin to MongoDB.
 *
 * Hot path breakdown:
 *  1. Build JWT + opaque refresh token
 *  2. Write 3 Redis keys in one pipeline (one round-trip)
 *  3. Write lastLogin + refreshTokenFamily to MongoDB (one findByIdAndUpdate)
 *
 * @returns {{ accessToken, refreshToken }}
 */
exports.issueTokens = async function (user, method, meta) {
  const { accessToken, refreshTokenRaw, family } = await buildAndStoreTokenPair(user);

  // Persist only the family ID and lastLogin to MongoDB - no token values in DB
  await User.findByIdAndUpdate(user._id, {
    $set: {
      refreshTokenFamily: family,
      lastLogin: buildLastLogin(method, meta),
    },
  });

  logger.info('Token pair issued (Redis)', { userId: user._id, method });
  return { accessToken, refreshToken: refreshTokenRaw };
};

exports.resolveGooglePayload = async function (token) {
  // Attempt 1: ID token (Sign In With Google credential flow)
  try {
    const ticket = await googleClient().verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (err) {
    logger.debug('Google ID token verification failed', err);
  }

  // Attempt 2: Access token → /userinfo
  try {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
    if (!data.sub && data.id) {
      data.sub = data.id;
    }
    return data;
  } catch (err) {
    logger.error('Google token resolution failed', { error: err.message });
    throw new Error('Invalid or expired Google token.');
  }
};

exports.fetchAuth0UserInfo = async function (accessToken) {
  try {
    const { data } = await axios.get(`https://${process.env.AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10_000,
    });
    return data;
  } catch (err) {
    logger.error('Auth0 /userinfo failed', { error: err.message });
    throw new Error(
      'Could not fetch Auth0 user profile. Ensure email + profile scopes are granted.',
    );
  }
};

/**
 * Extract login metadata from request.
 */
exports.getLoginMeta = function (req) {
  return {
    ip: req.clientIp || req.ip || 'Unknown',
    device: req.userAgent || req.headers['user-agent'] || 'Unknown',
    deviceId: req.body?.deviceId || null,
  };
};

/**
 * Safely sanitise user object before returning to client.
 * toJSON transform on the model removes tokens/password
 */
exports.sanitiseUser = function (user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  delete obj.password;
  delete obj.tokens;
  delete obj.pendingQr;
  return obj;
};
