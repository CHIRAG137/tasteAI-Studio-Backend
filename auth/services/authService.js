'use strict';

const bcrypt = require('bcrypt');

const User = require('../models/user');
const {
  hashRefreshToken,
  lookupRefreshToken,
  deleteRefreshToken,
  clearSession,
} = require('../../utils/tokenUtils');
const { verifyAuth0AccessToken } = require('../config/auth0Client');
const authUtils = require('../utils/authUtils');
const qrService = require('./qrService');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 12;

/**
 * Register a new user with email + password.
 * Creates user with isActive=false, then creates a Redis QR session.
 *
 * @returns {{ userId, sessionId, qrDataUrl, expiresAt }}
 *       OR {{ linked: true, userId }}  (when email/password is added to existing OAuth account)
 */
exports.registerUser = async (email, password, name, _ = {}) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    if (existingUser.password) {
      throw new Error('An account with this email already exists.');
    }
    if (!existingUser.authMethods.includes('email_password')) {
      // Link password to existing OAuth account — no new QR needed
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      existingUser.password = hashedPassword;
      if (name && !existingUser.name) {
        existingUser.name = name;
      }
      authUtils.addAuthMethod(existingUser, 'email_password');
      await existingUser.save();
      logger.info('Password linked to existing OAuth account', { userId: existingUser._id, email });
      return { linked: true, userId: existingUser._id.toString() };
    }
    throw new Error('An account with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    authMethods: ['email_password'],
    isActive: false,
  });

  const { sessionId, qrDataUrl, expiresAt } = await qrService.createQrSession(user._id);
  user.pendingQr = { sessionId, expiresAt };
  await user.save();

  logger.info('User registered — awaiting QR', { userId: user._id, email });
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

  const isValidUser = await user.verifyPassword(password);
  if (!isValidUser) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account not activated. Please complete mobile QR verification.');
  }
  if (user.isBanned) {
    throw new Error('Your account has been suspended.');
  }

  const tokens = await authUtils.issueTokens(user, 'email_password', meta);
  return { ...tokens, user };
};

/**
 * @returns {{ accessToken, refreshToken, user }}
 *       OR {{ isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user }}
 */
exports.googleLoginUser = async (googleToken, meta = {}) => {
  const payload = await authUtils.resolveGooglePayload(googleToken);
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

    const { sessionId, qrDataUrl, expiresAt } = await qrService.createQrSession(user._id);
    user.pendingQr = { sessionId, expiresAt };
    await user.save();

    logger.info('New Google user — awaiting QR', { userId: user._id, email });
    return { isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user };
  }

  // Existing user — enrich profile
  if (!user.googleId) {
    user.googleId = googleId;
  }
  authUtils.addAuthMethod(user, 'google');

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

  const tokens = await authUtils.issueTokens(user, 'google', meta);
  return { ...tokens, isNew: false, user };
};

/**
 * @returns {{ accessToken, refreshToken, user }}
 *       OR {{ isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user }}
 */
exports.auth0LoginUser = async (accessToken, meta = {}) => {
  const decoded = await verifyAuth0AccessToken(accessToken);
  const auth0Id = decoded.sub;
  const profile = await authUtils.fetchAuth0UserInfo(accessToken);

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

    const { sessionId, qrDataUrl, expiresAt } = await qrService.createQrSession(user._id);
    user.pendingQr = { sessionId, expiresAt };
    await user.save();

    logger.info('New Auth0 user — awaiting QR', { userId: user._id, email, auth0Id });
    return { isNew: true, qrRequired: true, sessionId, qrDataUrl, expiresAt, user };
  }

  // Existing user — enrich profile
  if (!user.auth0Id) {
    user.auth0Id = auth0Id;
  }
  authUtils.addAuthMethod(user, 'auth0');

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

  const tokens = await authUtils.issueTokens(user, 'auth0', meta);
  return { ...tokens, isNew: false, user };
};

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

  const hashedRefreshToken = hashRefreshToken(rawRefreshToken);
  const userId = await lookupRefreshToken(hashedRefreshToken);

  if (!userId) {
    // Token not in Redis — either expired naturally or already rotated.
    logger.warn('Refresh token not found — possible reuse/theft attempt');
    // The user must log in again — this is the correct, safe behaviour.
    throw new Error('Invalid or expired refresh token. Please log in again.');
  }

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
  await deleteRefreshToken(hashedRefreshToken);

  const tokens = await authUtils.issueTokens(user, user.lastLogin?.method || 'email_password', {
    ip: user.lastLogin?.ip,
    device: user.lastLogin?.device,
  });

  return tokens;
};

/**
 * Invalidate the user's session from Redis and clear the family ID from MongoDB.
 *
 * @param {string} userId
 * @param {string} [rawRefreshToken] - if provided, removes that specific refresh key too
 */
exports.logoutUser = async (userId, rawRefreshToken) => {
  const user = await User.findById(userId).select('refreshTokenFamily');

  const refreshHashedToken = rawRefreshToken ? hashRefreshToken(rawRefreshToken) : null;
  const family = user?.refreshTokenFamily || null;

  // Clear all Redis session keys in one pipeline
  await clearSession(userId, refreshHashedToken, family);

  // Clear family ID from MongoDB + record logout time
  await User.findByIdAndUpdate(userId, {
    $set: {
      refreshTokenFamily: null,
      lastLogoutAt: new Date(),
    },
  });

  logger.info('User logged out — session cleared from Redis', { userId });
};
