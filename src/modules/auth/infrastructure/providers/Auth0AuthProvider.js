'use strict';

const axios = require('axios');
const AuthProviderTypes = require('./AuthProviderTypes');
const { AppException } = require('../../../shared/exceptions');
const logger = require('../../../shared/logging');

class Auth0AuthProvider {
  constructor(auth0Client) {
    this._auth0Client = auth0Client;
  }

  getType() {
    return AuthProviderTypes.AUTH0;
  }

  async authenticate(command) {
    const decoded = await this._auth0Client.verifyAccessToken(command.accessToken);
    const profile = await this._fetchUserInfo(command.accessToken);

    const email = profile.email || decoded.email;
    if (!email) {
      throw new AppException({
        message:
          'Email is required. Enable "email" and "profile" scopes in your Auth0 application.',
        code: 'MISSING_EMAIL',
        statusCode: 401,
      });
    }

    return { profile, auth0Id: decoded.sub, email };
  }

  async _fetchUserInfo(accessToken) {
    try {
      const domain = this._auth0Client.getDomain();
      const { data } = await axios.get(`https://${domain}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10_000,
      });
      return data;
    } catch (err) {
      logger.error('Auth0 /userinfo request failed', { error: err.message });
      throw new AppException({
        message: 'Could not fetch Auth0 user profile. Ensure email + profile scopes are granted.',
        code: 'AUTH0_PROFILE_ERROR',
        statusCode: 502,
      });
    }
  }
}

module.exports = Auth0AuthProvider;
