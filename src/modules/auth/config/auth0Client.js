'use strict';

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

/**
 * Object-oriented configuration wrapper for the Auth0 SDK client and verification logic.
 * Encapsulates JWKS client caching, token verification, and configuration validation.
 */
class Auth0Client {
  /**
   * @param {object} options
   * @param {string} options.domain - Auth0 domain (e.g. tenant.auth0.com)
   * @param {string} options.audience - Auth0 audience (API identifier)
   */
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

  /**
   * Lazily initializes and returns the JWKS client.
   *
   * @returns {object} JWKS client instance
   */
  getJwksClient() {
    if (!this._jwksClient) {
      this._jwksClient = jwksClient({
        jwksUri: `https://${this._domain}/.well-known/jwks.json`,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 10 * 60 * 60 * 1000, // 10 hours
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
    }
    return this._jwksClient;
  }

  /**
   * Returns the configured Auth0 Domain.
   *
   * @returns {string}
   */
  getDomain() {
    return this._domain;
  }

  /**
   * Verifies an Auth0 RS256 access token against the Auth0 JWKS endpoint.
   *
   * @param {string} token - Raw Auth0 access token
   * @returns {Promise<object>} Decoded JWT payload
   */
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
