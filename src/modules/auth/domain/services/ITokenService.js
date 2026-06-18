'use strict';

class ITokenService {
  async issue(user, method, meta) {
    throw new Error('Not Implemented');
  }

  async refresh(rawRefreshToken) {
    throw new Error('Not Implemented');
  }

  async revoke(userId, rawRefreshToken) {
    throw new Error('Not Implemented');
  }

  verifyAccessToken(token) {
    throw new Error('Not Implemented');
  }
}

module.exports = ITokenService;
