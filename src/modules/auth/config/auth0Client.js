'use strict';

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { env } = require('../../../config/env');

/**
 * JWKS client for verifying Auth0 RS256 tokens.
 *
 * Uses a lazy singleton pattern — the client is created on first use
 * and cached for the lifetime of the process.
 */
let _jwksClient = null;

function getJwksClient() {
  if (_jwksClient) {
    return _jwksClient;
  }

  if (!env.AUTH0_DOMAIN) {
    throw new Error('[Config] AUTH0_DOMAIN is not configured');
  }

  _jwksClient = jwksClient({
    jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 60 * 1000, // 10 hours
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return _jwksClient;
}

/**
 * Verifies an Auth0 RS256 access token against the Auth0 JWKS endpoint.
 *
 * @param {string} token - Raw Auth0 access token
 * @returns {Promise<object>} Decoded JWT payload
 * @throws {Error} if the token is invalid, expired, or env vars are missing
 */
function verifyAuth0AccessToken(token) {
  return new Promise((resolve, reject) => {
    if (!env.AUTH0_AUDIENCE) {
      reject(new Error('[Config] AUTH0_AUDIENCE is not configured'));
      return;
    }

    const client = getJwksClient();

    jwt.verify(
      token,
      client.getSigningKey.bind(client),
      {
        audience: env.AUTH0_AUDIENCE,
        issuer: `https://${env.AUTH0_DOMAIN}/`,
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

module.exports = { verifyAuth0AccessToken };
