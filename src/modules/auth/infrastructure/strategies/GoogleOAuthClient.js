'use strict';

const { OAuth2Client } = require('google-auth-library');

class GoogleOAuthClient {
  constructor({ clientId }) {
    if (!clientId) {
      throw new Error('[GoogleOAuthClient] GOOGLE_CLIENT_ID is not configured');
    }
    this._clientId = clientId;
    this._client = null;
  }

  getClient() {
    if (!this._client) {
      this._client = new OAuth2Client(this._clientId);
    }
    return this._client;
  }

  getClientId() {
    return this._clientId;
  }

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
