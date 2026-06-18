'use strict';

const { OAuth2Client } = require('google-auth-library');
const { env } = require('../../../config/env');

let _client = null;

/**
 * Returns the singleton Google OAuth2Client instance.
 * Lazily initialised on first call.
 *
 * @returns {OAuth2Client}
 * @throws {Error} if GOOGLE_CLIENT_ID is not configured
 */
function googleClient() {
  if (_client) {
    return _client;
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('[Config] GOOGLE_CLIENT_ID is not configured');
  }

  _client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  return _client;
}

module.exports = { googleClient, clientId: () => env.GOOGLE_CLIENT_ID };
