'use strict';

/**
 * Maps application-layer use case results to standardised API response shapes.
 *
 * Using a plain object (not a class) since no instance state is needed.
 * All methods are pure functions of their inputs.
 */
const AuthResponseMapper = {
  /**
   * Successful login / token refresh response.
   * @param {import('../../domain/entities/User')} user
   * @param {{ accessToken: string, refreshToken: string }} tokens
   */
  tokens(user, tokens) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toPublicProfile(),
    };
  },

  /**
   * New user registration — account awaiting QR activation.
   */
  registration(userId, sessionId, qrDataUrl, expiresAt) {
    return { userId, sessionId, qrDataUrl, expiresAt };
  },

  /**
   * OAuth-only account that now has a password linked.
   */
  linked(userId) {
    return { linked: true, userId };
  },

  /**
   * New OAuth user — QR activation required before login is allowed.
   */
  qrRequired(user, sessionId, qrDataUrl, expiresAt) {
    return {
      isNew: true,
      qrRequired: true,
      sessionId,
      qrDataUrl,
      expiresAt,
      user: user.toPublicProfile(),
    };
  },

  /**
   * Token refresh response.
   */
  refresh(tokens) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  /**
   * Current user profile response.
   */
  profile(user) {
    return user.toPublicProfile();
  },
};

module.exports = AuthResponseMapper;
