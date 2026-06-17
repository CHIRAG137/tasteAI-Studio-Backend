('use strict');

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

let _auth0client = null;

function getJwksClient() {
  if (_auth0client) {
    return _auth0client;
  }

  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }

  _auth0client = jwksClient({
    jwksUri: `https://${domain}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 60 * 1000,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return _auth0client;
}

exports.getSigningKey = function (header, callback) {
  getJwksClient().getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }

    callback(null, key.getPublicKey());
  });
};

/**
 * Verify an Auth0 RS256 access token.
 * @param {string} token
 * @returns {Promise<object>} decoded payload
 */
exports.verifyAuth0AccessToken = function (token) {
  return new Promise((resolve, reject) => {
    if (!process.env.AUTH0_AUDIENCE) {
      reject(new Error('AUTH0_AUDIENCE is not configured'));
      return;
    }

    jwt.verify(
      token,
      getJwksClient().getSigningKey.bind(getJwksClient()),
      {
        audience: process.env.AUTH0_AUDIENCE,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(decoded);
      },
    );
  });
};
