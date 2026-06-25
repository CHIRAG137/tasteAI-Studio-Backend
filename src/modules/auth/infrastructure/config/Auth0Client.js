'use strict';

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

class Auth0Client {
  constructor({ domain, audience }) {
    if (!domain) {
      throw new Error('[Auth0Client] domain is required');
    }
    if (!audience) {
      throw new Error('[Auth0Client] audience is required');
    }

    this._domain = domain;
    this._audience = audience;
    this._jwksClient = null;
  }

  getJwksClient() {
    if (!this._jwksClient) {
      this._jwksClient = jwksClient({
        jwksUri: `https://${this._domain}/.well-known/jwks.json`,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 10 * 60 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
    }
    return this._jwksClient;
  }

  getDomain() {
    return this._domain;
  }

  verifyAccessToken(token) {
    return new Promise((resolve, reject) => {
      const client = this.getJwksClient();

      jwt.verify(
        token,
        client.getSigningKey.bind(client),
        {
          audience: this._audience,
          issuer: `https://${this._domain}/`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            return reject(err);
          }
          return resolve(decoded);
        },
      );
    });
  }
}

module.exports = Auth0Client;
