'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../../../../config/env');

class JwtSigner {
  static ACCESS_TOKEN_EXPIRY_S = 15 * 60;
  static REFRESH_TOKEN_EXPIRY_S = 30 * 24 * 60 * 60;

  signAccessToken(userId, email) {
    return jwt.sign(
      { sub: userId.toString(), email: email ?? undefined, type: 'access' },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        issuer: env.JWT_ISSUER || 'auth-service',
        audience: env.JWT_AUDIENCE || 'app-client',
      },
    );
  }

  verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER || 'auth-service',
      audience: env.JWT_AUDIENCE || 'app-client',
    });
  }

  createRefreshToken() {
    const raw = crypto.randomBytes(64).toString('hex');
    const hashed = this._sha256(raw);
    const family = crypto.randomBytes(16).toString('hex');
    return { raw, hashed, family };
  }

  hashRefreshToken(raw) {
    return this._sha256(raw);
  }

  _sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

module.exports = JwtSigner;
