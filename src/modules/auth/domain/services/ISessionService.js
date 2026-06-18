'use strict';

class ISessionService {
  async validateAccessToken(userId, token) {
    throw new Error('Not Implemented');
  }
}

module.exports = ISessionService;
