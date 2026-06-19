'use strict';

const { OAuth2Client } = require('google-auth-library');

/**
 * Object-oriented configuration wrapper for the Google OAuth SDK client.
 * Provides lazy-loading client caching, strict config validation, and clean encapsulation of verification logic.
 */
class GoogleOAuthClient {
  /**
   * @param {object} options
   * @param {string} options.clientId - Google OAuth client ID
   */
  constructor({ clientId }) {
    if (!clientId) {
      throw new Error('[GoogleOAuthClient] GOOGLE_CLIENT_ID is not configured');
    }
    this._clientId = clientId;
    this._client = null;
  }

  /**
   * Lazily initializes and returns the OAuth2Client instance.
   *
   * @returns {OAuth2Client}
   */
  getClient() {
    if (!this._client) {
      this._client = new OAuth2Client(this._clientId);
    }
    return this._client;
  }

  /**
   * Returns the configured Google Client ID.
   *
   * @returns {string}
   */
  getClientId() {
    return this._clientId;
  }

  /**
   * Verifies a Google ID token and returns its payload.
   *
   * @param {string} idToken - The Google ID token presented by client
   * @returns {Promise<object>} Token payload
   */
  async verifyIdToken(idToken) {
    const client = this.getClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: this._clientId,
    });
    return ticket.getPayload();
  }
}

module.exports = GoogleOAuthClient;
