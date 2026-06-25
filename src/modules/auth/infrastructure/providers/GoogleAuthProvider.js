'use strict';

const axios = require('axios');
const AuthProviderTypes = require('./AuthProviderTypes');
const { AppException } = require('../../../shared/exceptions');
const logger = require('../../../shared/logging');

class GoogleAuthProvider {
  constructor(googleOAuthClient) {
    this.googleOAuthClient = googleOAuthClient;
  }

  getType() {
    return AuthProviderTypes.GOOGLE;
  }

  async authenticate(command) {
    const payload = await this._resolvePayload(command.token);
    return { profile: payload };
  }

  async _resolvePayload(token) {
    try {
      return await this.googleOAuthClient.verifyIdToken(token);
    } catch (err) {
      logger.debug('Google ID token verification failed — trying userinfo', { error: err.message });
    }

    try {
      const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      });
      if (!data.sub && data.id) {
        data.sub = data.id;
      }
      return data;
    } catch (err) {
      logger.error('Google token resolution failed', { error: err.message });
      throw new AppException({
        message: 'Invalid or expired Google token.',
        code: 'INVALID_OAUTH_TOKEN',
        statusCode: 401,
      });
    }
  }
}

module.exports = GoogleAuthProvider;
