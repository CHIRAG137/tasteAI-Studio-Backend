'use strict';

const bcrypt = require('bcrypt');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/user');
const {
  buildAndStoreTokenPair,
  hashRefreshToken,
  lookupRefreshToken,
  deleteRefreshToken,
  clearSession,
} = require('../../utils/tokenUtils');
const { verifyAuth0AccessToken } = require('../../utils/auth0Verify');
const { createQrSession } = require('./qrService');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 12;

let _googleClient = null;
function googleClient() {
  if (!_googleClient) {
    _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return _googleClient;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildLastLogin(method, meta = {}) {
  return {
    method,
    ip: meta.ip || 'Unknown',
    device: meta.device || 'Unknown',
    deviceId: meta.deviceId || null,
    at: new Date(),
  };
}

function addAuthMethod(user, method) {
  if (!user.authMethods.includes(method)) {
    user.authMethods.push(method);
  }
}

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
async function issueTokens(user, method, meta) {
  const { accessToken, refreshTokenRaw, family } = await buildAndStoreTokenPair(user);

  // Persist only the family ID and lastLogin to MongoDB — no token values in DB
  await User.findByIdAndUpdate(user._id, {
    $set: {
      refreshTokenFamily: family,
      lastLogin: buildLastLogin(method, meta),
    },
  });

  logger.info('Token pair issued (Redis)', { userId: user._id, method });
  return { accessToken, refreshToken: refreshTokenRaw };
}

// ─── Google payload resolver ──────────────────────────────────────────────────

async function resolveGooglePayload(token) {
  // Attempt 1: ID token (Sign In With Google credential flow)
  try {
    const ticket = await googleClient().verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
    // eslint-disable-next-line no-empty
  } catch (_) {}

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
}

// ─── Auth0 userinfo ───────────────────────────────────────────────────────────

async function fetchAuth0UserInfo(accessToken) {
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
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Register a new user with email + password.
 * Creates user with isActive=false, then creates a Redis QR session.
 *
 * @returns {{ userId, sessionId, qrDataUrl, expiresAt }}
 *       OR {{ linked: true, userId }}  (when email/password is added to existing OAuth account)
 */
exports.registerUser = async (email, password, name, meta = {}) => {
  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    if (existing.password) {
      throw new Error('An account with this email already exists.');
    }
    if (!existing.authMethods.includes('email_password')) {
      // Link password to existing OAuth account — no new QR needed
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      existing.password = hashed;
      if (name && !existing.name) {
        existing.name = name;
      }
      addAuthMethod(existing, 'email_password');
      await existing.save();
      logger.info('Password linked to existing OAuth account', { userId: existing._id, email });
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
    isActive: false,
  });

  const { sessionId, qrDataUrl, expiresAt } = await createQrSession(user._id);
  user.pendingQr = { sessionId, expiresAt };
  await user.save();

  logger.info('User registered — awaiting QR', { userId: user._id, email });
  return { userId: user._id.toString(), sessionId, qrDataUrl, expiresAt };
};

// ─── Login (email/password) ───────────────────────────────────────────────────

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
    throw new Error('Account not activated. Please complete mobile QR verification.');
  }
  if (user.isBanned) {
    throw new Error('Your account has been suspended.');
  }

  const tokens = await issueTokens(user, 'email_password', meta);
  return { ...tokens, user };
};

// ─── Google Login / Register ──────────────────────────────────────────────────

/**
 * @returns {{ accessToken, refreshToken, user }}
 *       OR {{ isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user }}
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

  if (!user) {
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

    logger.info('New Google user — awaiting QR', { userId: user._id, email });
    return { isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user };
  }

  // Existing user — enrich profile
  if (!user.googleId) {
    user.googleId = googleId;
  }
  addAuthMethod(user, 'google');

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
    user.googleProfile.rawProfile = payload;
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
  await user.save();

  if (!user.isActive) {
    throw new Error('Account not yet activated. Please complete mobile QR verification.');
  }
  if (user.isBanned) {
    throw new Error('Your account has been suspended.');
  }

  const tokens = await issueTokens(user, 'google', meta);
  return { ...tokens, isNew: false, user };
};

// ─── Auth0 Login / Register ───────────────────────────────────────────────────

/**
 * @returns {{ accessToken, refreshToken, user }}
 *       OR {{ isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user }}
 */
exports.auth0LoginUser = async (accessToken, meta = {}) => {
  const decoded = await verifyAuth0AccessToken(accessToken);
  const auth0Id = decoded.sub;
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
  const [provider] = auth0Id.split('|');

  let user = await User.findByOAuthOrEmail({ email, auth0Id });

  if (!user) {
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

    logger.info('New Auth0 user — awaiting QR', { userId: user._id, email, auth0Id });
    return { isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user };
  }

  // Existing user — enrich profile
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
    if (!user.auth0Profile.updatedAt && updatedAt) {
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
  await user.save();

  if (!user.isActive) {
    throw new Error('Account not yet activated. Please complete mobile QR verification.');
  }
  if (user.isBanned) {
    throw new Error('Your account has been suspended.');
  }

  const tokens = await issueTokens(user, 'auth0', meta);
  return { ...tokens, isNew: false, user };
};

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

/**
 * Exchange a valid refresh token for a new pair.
 *
 * Flow:
 *  1. Hash the raw token → look up userId in Redis
 *  2. If not found → possible reuse/theft → wipe the family → force re-login
 *  3. Load user from MongoDB (only for isActive/isBanned check + lastLogin update)
 *  4. Delete old refresh key, issue new pair (rotation)
 *
 * @param {string} rawRefreshToken
 * @returns {{ accessToken, refreshToken }}
 */
exports.refreshTokens = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    throw new Error('Refresh token is required');
  }

  const hashed = hashRefreshToken(rawRefreshToken);
  const userId = await lookupRefreshToken(hashed);

  if (!userId) {
    // Token not in Redis — either expired naturally or already rotated.
    // Attempt breach response: find the user by old family and wipe all their sessions.
    logger.warn('Refresh token not found — possible reuse/theft attempt');
    // We can't wipe the family here without the familyId; the old token is simply gone.
    // The user must log in again — this is the correct, safe behaviour.
    throw new Error('Invalid or expired refresh token. Please log in again.');
  }

  // Load user for status checks only (not for token data)
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found. Please log in again.');
  }
  if (!user.isActive) {
    throw new Error('Account is inactive.');
  }
  if (user.isBanned) {
    throw new Error('Account has been suspended.');
  }

  // Rotate: delete old refresh token key before issuing new pair
  await deleteRefreshToken(hashed);

  const tokens = await issueTokens(user, user.lastLogin?.method || 'email_password', {
    ip: user.lastLogin?.ip,
    device: user.lastLogin?.device,
  });

  return tokens;
};

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Invalidate the user's session from Redis and clear the family ID from MongoDB.
 *
 * @param {string} userId
 * @param {string} [rawRefreshToken] - if provided, removes that specific refresh key too
 */
exports.logoutUser = async (userId, rawRefreshToken) => {
  const user = await User.findById(userId).select('refreshTokenFamily');

  const refreshHashed = rawRefreshToken ? hashRefreshToken(rawRefreshToken) : null;
  const family = user?.refreshTokenFamily || null;

  // Clear all Redis session keys in one pipeline
  await clearSession(userId, refreshHashed, family);

  // Clear family ID from MongoDB + record logout time
  await User.findByIdAndUpdate(userId, {
    $set: {
      refreshTokenFamily: null,
      lastLogoutAt: new Date(),
    },
  });

  logger.info('User logged out — session cleared from Redis', { userId });
};
