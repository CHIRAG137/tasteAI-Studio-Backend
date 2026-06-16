'use strict';

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

let _client = null;

function getJwksClient() {
  if (_client) {
    return _client;
  }

  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }

  _client = jwksClient({
    jwksUri: `https://${domain}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 60 * 1000, // 10 h
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return _client;
}

function getSigningKey(header, callback) {
  getJwksClient().getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    callback(null, key.getPublicKey());
  });
}

/**
 * Verify an Auth0 RS256 access token.
 * @param {string} token
 * @returns {Promise<object>} decoded payload
 */
function verifyAuth0AccessToken(token) {
  return new Promise((resolve, reject) => {
    if (!process.env.AUTH0_AUDIENCE) {
      return reject(new Error('AUTH0_AUDIENCE is not configured'));
    }

    jwt.verify(
      token,
      getSigningKey,
      {
        audience: process.env.AUTH0_AUDIENCE,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      },
    );
  });
}

module.exports = { verifyAuth0AccessToken };
