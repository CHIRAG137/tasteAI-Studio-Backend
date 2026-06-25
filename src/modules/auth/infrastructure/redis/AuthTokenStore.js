'use strict';

const AuthRedisKeyScheme = require('./AuthRedisKeyScheme');
const JwtSigner = require('../services/JwtSigner');

class AuthTokenStore {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async storeTokenPair({ userId, accessToken, refreshHashed, family }) {
    await this.redis.pipeline([
      {
        cmd: 'set',
        args: [
          AuthRedisKeyScheme.access(userId),
          accessToken,
          { EX: JwtSigner.ACCESS_TOKEN_EXPIRY_S },
        ],
      },
      {
        cmd: 'set',
        args: [
          AuthRedisKeyScheme.refresh(refreshHashed),
          userId.toString(),
          { EX: JwtSigner.REFRESH_TOKEN_EXPIRY_S },
        ],
      },
      {
        cmd: 'set',
        args: [
          AuthRedisKeyScheme.family(family),
          userId.toString(),
          { EX: JwtSigner.REFRESH_TOKEN_EXPIRY_S },
        ],
      },
    ]);
  }

  async validateToken(userId, token) {
    const stored = await this.redis.get(AuthRedisKeyScheme.access(userId));
    return stored === token;
  }

  async lookupRefresh(hashed) {
    return this.redis.get(AuthRedisKeyScheme.refresh(hashed));
  }

  async lookupFamily(familyId) {
    return this.redis.get(AuthRedisKeyScheme.family(familyId));
  }

  async deleteRefresh(hashed) {
    await this.redis.del(AuthRedisKeyScheme.refresh(hashed));
  }

  async clearSession(userId, refreshHashed, family) {
    const ops = [{ cmd: 'del', args: [AuthRedisKeyScheme.access(userId)] }];
    if (refreshHashed) {
      ops.push({ cmd: 'del', args: [AuthRedisKeyScheme.refresh(refreshHashed)] });
    }
    if (family) {
      ops.push({ cmd: 'del', args: [AuthRedisKeyScheme.family(family)] });
    }
    await this.redis.pipeline(ops);
  }

  async wipeFamilyTokens(familyId, userId, currentRefreshHashed) {
    await this.redis.pipeline([
      { cmd: 'del', args: [AuthRedisKeyScheme.family(familyId)] },
      { cmd: 'del', args: [AuthRedisKeyScheme.refresh(currentRefreshHashed)] },
      { cmd: 'del', args: [AuthRedisKeyScheme.access(userId)] },
    ]);
  }
}

module.exports = AuthTokenStore;
