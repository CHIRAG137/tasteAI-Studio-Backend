const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

function getJwks() {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) {
    throw new Error('AUTH0_DOMAIN is not configured');
  }
  return jwksClient({
    jwksUri: `https://${domain}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
  });
}

let client;

function getSigningKey(header, callback) {
  if (!client) client = getJwks();
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Verifies an Auth0-issued access token (RS256) for your API audience.
 */
exports.verifyAuth0AccessToken = (token) => {
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
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
};
