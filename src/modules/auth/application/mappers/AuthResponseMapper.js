'use strict';

const AuthResponseMapper = {
  tokens(user, tokens) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toPublicProfile(),
    };
  },

  registration(userId, sessionId, qrDataUrl, expiresAt) {
    return { userId, sessionId, qrDataUrl, expiresAt };
  },

  linked(userId) {
    return { linked: true, userId };
  },

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

  refresh(tokens) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  profile(user) {
    return user.toPublicProfile();
  },
};

module.exports = AuthResponseMapper;
