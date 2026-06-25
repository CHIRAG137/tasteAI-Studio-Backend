'use strict';

class RedisSessionService {
  constructor(tokenStore) {
    this.tokenStore = tokenStore;
  }

  async validateAccessToken(userId, token) {
    return this.tokenStore.validateToken(userId, token);
  }
}

module.exports = RedisSessionService;
