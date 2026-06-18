'use strict';

const axios = require('axios');
const IAuthProvider = require('../../domain/providers/IAuthProvider');
const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');
const AuthException = require('../../domain/exceptions/AuthException');
const logger = require('../../../shared/logging');

/**
 * Auth0 OAuth authentication provider.
 *
 * Accepts `verifyToken` and `auth0Domain` via constructor injection
 * rather than reading process.env inside methods.
 */
class Auth0AuthProvider extends IAuthProvider {
  /**
   * @param {Function} verifyToken - Bound verifyAuth0AccessToken from config/auth0Client
   * @param {string} auth0Domain - AUTH0_DOMAIN, injected from config
   */
  constructor(verifyToken, auth0Domain) {
    super();
    this._verifyToken = verifyToken;
    this._auth0Domain = auth0Domain;
  }

  getType() {
    return AuthProviderTypes.AUTH0;
  }

  async authenticate(command) {
    const decoded = await this._verifyToken(command.accessToken);
    const profile = await this._fetchUserInfo(command.accessToken);

    const email = profile.email || decoded.email;
    if (!email) {
      throw new AuthException(
        'Email is required. Enable "email" and "profile" scopes in your Auth0 application.',
        'MISSING_EMAIL',
      );
    }

    return { profile, auth0Id: decoded.sub, email };
  }

  /** @private */
  async _fetchUserInfo(accessToken) {
    try {
      const { data } = await axios.get(`https://${this._auth0Domain}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10_000,
      });
      return data;
    } catch (err) {
      logger.error('Auth0 /userinfo request failed', { error: err.message });
      throw new AuthException(
        'Could not fetch Auth0 user profile. Ensure email + profile scopes are granted.',
        'AUTH0_PROFILE_ERROR',
      );
    }
  }
}

module.exports = Auth0AuthProvider;
