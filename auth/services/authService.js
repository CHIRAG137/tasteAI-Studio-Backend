'use strict';

const bcrypt = require('bcrypt');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/user');
const { buildTokenPair, hashRefreshToken, isExpired } = require('../../utils/tokenUtils');
const { verifyAuth0AccessToken } = require('../../utils/auth0Verify');
const { createQrSession } = require('./qrService');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 12;

// Lazy-init Google client (avoids crashing at import if env not loaded yet)
let _googleClient = null;
function googleClient() {
  if (!_googleClient) {
    _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return _googleClient;
}

/**
 * Build the lastLogin block from request metadata.
 */
function buildLastLogin(method, meta = {}) {
  return {
    method,
    ip: meta.ip || 'Unknown',
    device: meta.device || 'Unknown',
    deviceId: meta.deviceId || null,
    at: new Date(),
  };
}

/**
 * Issue a fresh token pair, persist to DB, return the pair.
 * Access token is stored in DB for single-session enforcement.
 * Refresh token is stored as a SHA-256 hash.
 */
async function issueTokens(user, method, meta) {
  const { accessToken, refreshTokenRaw, dbTokens } = buildTokenPair(user);

  user.tokens = dbTokens;
  user.lastLogin = buildLastLogin(method, meta);
  user.isActive = true;
  await user.save();

  logger.info('Token pair issued', { userId: user._id, method });
  return { accessToken, refreshToken: refreshTokenRaw };
}

/**
 * Add an auth method to the user's authMethods array if not already present.
 */
function addAuthMethod(user, method) {
  if (!user.authMethods.includes(method)) {
    user.authMethods.push(method);
  }
}

async function resolveGooglePayload(token) {
  // Attempt 1: ID token (credential response from Sign In With Google button)
  try {
    const ticket = await googleClient().verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (_) {
    // Fall through to access token flow
  }

  // Attempt 2: Access token → /userinfo
  try {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
    // Normalise: v3 userinfo uses "sub" not "id"
    if (!data.sub && data.id) {
      data.sub = data.id;
    }
    return data;
  } catch (err) {
    logger.error('Google token resolution failed', { error: err.message });
    throw new Error('Invalid or expired Google token.');
  }
}

async function fetchAuth0UserInfo(accessToken) {
  const domain = process.env.AUTH0_DOMAIN;
  try {
    const { data } = await axios.get(`https://${domain}/userinfo`, {
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
}

/**
 * Resolve the family from a hashed token (best-effort; used for breach detection).
 */
async function resolveFamily(hashed) {
  const u = await User.findOne({ 'tokens.refreshToken': hashed }).select('tokens');
  return u?.tokens?.refreshTokenFamily;
}

/**
 * Register a new user with email + password.
 *
 * Flow:
 *  1. Check for duplicate email.
 *  2. Hash password.
 *  3. Create user (isActive = false — pending QR).
 *  4. Create a QR session and return the QR.
 *  5. The caller must wait for QR scan before the account is usable.
 *
 * @returns {{ userId, sessionId, qrDataUrl, expiresAt }}
 */
exports.registerUser = async (email, password, name, meta = {}) => {
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    // Allow linking password to an existing OAuth-only account
    if (existing.password) {
      throw new Error('An account with this email already exists.');
    }
    if (!existing.authMethods.includes('email_password')) {
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      existing.password = hashed;
      if (name && !existing.name) {
        existing.name = name;
      }
      addAuthMethod(existing, 'email_password');
      // No new QR needed — user already verified during their first OAuth registration
      await existing.save();
      logger.info('Password linked to existing OAuth account', {
        userId: existing._id,
        email,
      });
      return { linked: true, userId: existing._id.toString() };
    }
    throw new Error('An account with this email already exists.');
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({
    email: email.toLowerCase(),
    password: hashed,
    name,
    authMethods: ['email_password'],
    isActive: false, // activated after QR scan
  });

  const { sessionId, qrDataUrl, expiresAt } = await createQrSession(user._id);
  user.pendingQr = { sessionId, expiresAt };
  await user.save();

  logger.info('User registered, awaiting QR verification', {
    userId: user._id,
    email,
  });
  return { userId: user._id.toString(), sessionId, qrDataUrl, expiresAt };
};

/**
 * @returns {{ accessToken, refreshToken, user }}
 */
exports.loginUser = async (email, password, meta = {}) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.password) {
    throw new Error(
      'This email is registered via Google or Auth0. Please use your original sign-in method.',
    );
  }

  const valid = await user.verifyPassword(password);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is not activated. Please complete mobile verification.');
  }
  if (user.isBanned) {
    throw new Error('Your account has been suspended.');
  }

  const tokens = await issueTokens(user, 'email_password', meta);
  return { ...tokens, user };
};

/**
 * Handles both ID tokens (credential flow) and access tokens (implicit flow).
 *
 * @returns {{ accessToken, refreshToken, user, isNew, qrRequired, sessionId, qrDataUrl, expiresAt }}
 */
exports.googleLoginUser = async (googleToken, meta = {}) => {
  const payload = await resolveGooglePayload(googleToken);

  const {
    sub: googleId,
    email,
    name,
    given_name: givenName,
    family_name: familyName,
    picture,
    locale,
    hd: hostedDomain,
    email_verified: emailVerified,
  } = payload;

  let user = await User.findByOAuthOrEmail({ email, googleId });
  let isNew = false;

  if (!user) {
    isNew = true;
    user = await User.create({
      email: email.toLowerCase(),
      name,
      googleId,
      googleProfile: {
        googleId,
        email,
        name,
        givenName,
        familyName,
        picture,
        locale,
        emailVerified: !!emailVerified,
        hostedDomain,
        rawProfile: payload,
      },
      avatarUrl: picture,
      authMethods: ['google'],
      isEmailVerified: !!emailVerified,
      isActive: false,
    });

    const { sessionId, qrDataUrl, expiresAt } = await createQrSession(user._id);
    user.pendingQr = { sessionId, expiresAt };
    await user.save();

    logger.info('New Google user created, awaiting QR', {
      userId: user._id,
      email,
    });
    return {
      isNew: true,
      qrRequired: true,
      sessionId,
      qrDataUrl,
      expiresAt,
      user,
    };
  }

  // Existing user — enrich profile fields
  if (!user.googleId) {
    user.googleId = googleId;
  }
  addAuthMethod(user, 'google');

  // Merge any new profile data (never overwrite existing)
  if (!user.googleProfile) {
    user.googleProfile = {
      googleId,
      email,
      name,
      givenName,
      familyName,
      picture,
      locale,
      emailVerified: !!emailVerified,
      hostedDomain,
      rawProfile: payload,
    };
  } else {
    user.googleProfile.rawProfile = payload; // keep raw fresh
    if (!user.googleProfile.picture && picture) {
      user.googleProfile.picture = picture;
    }
    if (!user.googleProfile.givenName && givenName) {
      user.googleProfile.givenName = givenName;
    }
    if (!user.googleProfile.familyName && familyName) {
      user.googleProfile.familyName = familyName;
    }
  }

  if (!user.avatarUrl && picture) {
    user.avatarUrl = picture;
  }
  if (!user.name && name) {
    user.name = name;
  }
  if (!user.isEmailVerified && emailVerified) {
    user.isEmailVerified = true;
  }

  if (!user.isActive) {
    throw new Error('Account not yet activated. Please complete mobile QR verification.');
  }
  if (user.isBanned) {
    throw new Error('Your account has been suspended.');
  }

  const tokens = await issueTokens(user, 'google', meta);
  return { ...tokens, isNew: false, user };
};

/**
 * @returns {{ accessToken, refreshToken, user, isNew, qrRequired, ... }}
 */
exports.auth0LoginUser = async (accessToken, meta = {}) => {
  const decoded = await verifyAuth0AccessToken(accessToken);
  const auth0Id = decoded.sub;

  // Fetch full profile from /userinfo endpoint for richer data
  const profile = await fetchAuth0UserInfo(accessToken);

  const email = profile.email || decoded.email;
  if (!email) {
    throw new Error(
      'Email is required. Enable "email" and "profile" scopes in your Auth0 application.',
    );
  }

  const {
    name,
    nickname,
    picture,
    locale,
    updated_at: updatedAt,
    email_verified: emailVerified,
  } = profile;

  // Derive connection/provider from sub (e.g. "google-oauth2|123" → "google-oauth2")
  const [provider] = auth0Id.split('|');

  let user = await User.findByOAuthOrEmail({ email, auth0Id });
  let isNew = false;

  if (!user) {
    isNew = true;
    user = await User.create({
      email: email.toLowerCase(),
      name: name || nickname,
      auth0Id,
      avatarUrl: picture,
      auth0Profile: {
        auth0Id,
        email,
        emailVerified: !!emailVerified,
        name,
        nickname,
        picture,
        locale,
        updatedAt,
        connection: provider,
        provider,
        rawProfile: profile,
      },
      authMethods: ['auth0'],
      isEmailVerified: !!emailVerified,
      isActive: false,
    });

    const { sessionId, qrDataUrl, expiresAt } = await createQrSession(user._id);
    user.pendingQr = { sessionId, expiresAt };
    await user.save();

    logger.info('New Auth0 user created, awaiting QR', {
      userId: user._id,
      email,
      auth0Id,
    });
    return {
      isNew: true,
      qrRequired: true,
      sessionId,
      qrDataUrl,
      expiresAt,
      user,
    };
  }

  // Existing user
  if (!user.auth0Id) {
    user.auth0Id = auth0Id;
  }
  addAuthMethod(user, 'auth0');

  if (!user.auth0Profile) {
    user.auth0Profile = {
      auth0Id,
      email,
      emailVerified: !!emailVerified,
      name,
      nickname,
      picture,
      locale,
      updatedAt,
      connection: provider,
      provider,
      rawProfile: profile,
    };
  } else {
    user.auth0Profile.rawProfile = profile;
    if (!user.auth0Profile.picture && picture) {
      user.auth0Profile.picture = picture;
    }
    if (!user.auth0Profile.updatedAt) {
      user.auth0Profile.updatedAt = updatedAt;
    }
  }

  if (!user.avatarUrl && picture) {
    user.avatarUrl = picture;
  }
  if (!user.name && (name || nickname)) {
    user.name = name || nickname;
  }
  if (!user.isEmailVerified && emailVerified) {
    user.isEmailVerified = true;
  }

  if (!user.isActive) {
    throw new Error('Account not yet activated. Please complete mobile QR verification.');
  }
  if (user.isBanned) {
    throw new Error('Your account has been suspended.');
  }

  const tokens = await issueTokens(user, 'auth0', meta);
  return { ...tokens, isNew: false, user };
};

/**
 * Exchange a valid refresh token for a new token pair.
 * Old refresh token is invalidated (rotation).
 * Reuse of an already-used refresh token invalidates the entire family (security).
 *
 * @param {string} rawRefreshToken
 * @returns {{ accessToken, refreshToken }}
 */
exports.refreshTokens = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    throw new Error('Refresh token is required');
  }

  const hashed = hashRefreshToken(rawRefreshToken);
  const user = await User.findOne({ 'tokens.refreshToken': hashed });

  if (!user) {
    logger.warn('Refresh token reuse detected — possible token theft', {
      hashed,
    });
    // Invalidate entire family by wiping tokens (all sessions forced to re-login)
    await User.findOneAndUpdate(
      { 'tokens.refreshTokenFamily': await resolveFamily(hashed) },
      { $set: { tokens: {} } },
    );
    throw new Error('Invalid or reused refresh token. Please log in again.');
  }

  if (isExpired(user.tokens.refreshTokenExpiresAt)) {
    user.tokens = {};
    await user.save();
    throw new Error('Refresh token expired. Please log in again.');
  }

  if (!user.isActive || user.isBanned) {
    throw new Error('Account inactive or suspended.');
  }

  const tokens = await issueTokens(user, user.lastLogin?.method || 'email_password', {
    ip: user.lastLogin?.ip,
    device: user.lastLogin?.device,
  });

  return tokens;
};

/**
 * Clear token pair and deactivate session.
 * @param {string} userId
 */
exports.logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    $set: {
      tokens: {},
      lastLogoutAt: new Date(),
      isActive: false,
    },
  });
  logger.info('User logged out', { userId });
};
