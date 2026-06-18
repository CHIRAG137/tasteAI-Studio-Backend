'use strict';

const axios = require('axios');
const IAuthProvider = require('../../domain/providers/IAuthProvider');
const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');
const AuthException = require('../../domain/exceptions/AuthException');
const logger = require('../../../shared/logging');

/**
 * Google OAuth authentication provider.
 *
 * Accepts `googleClient` and `clientId` via constructor injection
 * rather than reading process.env inside methods.
 *
 * Verification strategy:
 *   1. Try verifyIdToken (ID token flow)
 *   2. Fallback to /userinfo endpoint (access token flow)
 */
class GoogleAuthProvider extends IAuthProvider {
  /**
   * @param {import('google-auth-library').OAuth2Client} googleClient
   * @param {string} clientId - GOOGLE_CLIENT_ID, injected from config
   */
  constructor(googleClient, clientId) {
    super();
    this.googleClient = googleClient;
    this.clientId = clientId;
  }

  getType() {
    return AuthProviderTypes.GOOGLE;
  }

  async authenticate(command) {
    const payload = await this._resolvePayload(command.token);
    return { profile: payload };
  }

  /** @private */
  async _resolvePayload(token) {
    // Strategy 1: ID token verification (most secure)
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.clientId,
      });
      return ticket.getPayload();
    } catch (err) {
      logger.debug('Google ID token verification failed — trying userinfo', { error: err.message });
    }

    // Strategy 2: access token userinfo endpoint
    try {
      const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      });
      // Normalise: some endpoints return 'id' instead of 'sub'
      if (!data.sub && data.id) {
        data.sub = data.id;
      }
      return data;
    } catch (err) {
      logger.error('Google token resolution failed', { error: err.message });
      throw new AuthException('Invalid or expired Google token.', 'INVALID_OAUTH_TOKEN');
    }
  }
}

module.exports = GoogleAuthProvider;
