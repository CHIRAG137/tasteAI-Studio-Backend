'use strict';

const OAuthStrategy = require('./OAuthStrategy');
const AuthProviderType = require('./AuthProviderType');
const User = require('../../../domain/User');
const { UnauthorizedException } = require('../../../../shared/exceptions');

class Auth0Strategy extends OAuthStrategy {
  constructor({ userRepository, tokenService, verificationService, eventBus, auth0Client }) {
    super({ userRepository, tokenService, verificationService, eventBus });
    this.auth0Client = auth0Client;
  }

  getType() {
    return AuthProviderType.AUTH0;
  }

  get oauthIdField() {
    return 'auth0Id';
  }

  async authenticate(command) {
    const { accessToken } = command;
    if (!accessToken) {
      throw new UnauthorizedException('Auth0 access token is required', 'INVALID_TOKEN');
    }

    let decoded;
    try {
      decoded = await this.auth0Client.verifyAccessToken(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid Auth0 token', 'INVALID_TOKEN');
    }

    const fetch = require('node-fetch');
    const resp = await fetch(`https://${this.auth0Client.getDomain()}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      throw new UnauthorizedException('Failed to fetch Auth0 user info', 'INVALID_TOKEN');
    }

    const profile = await resp.json();
    const auth0Id = decoded.sub || profile.sub;

    return { profile, auth0Id, email: profile.email };
  }

  _extractProfile(authResult) {
    const p = authResult.profile;
    return {
      oauthId: authResult.auth0Id,
      email: authResult.email,
      name: p.name,
      nickname: p.nickname,
      picture: p.picture,
      locale: p.locale,
      updatedAt: p.updated_at,
      emailVerified: Boolean(p.email_verified),
      rawProfile: p,
    };
  }

  async _createUserFromProfile(profile) {
    const [providerName] = profile.oauthId.split('|');
    return this.userRepository.create(
      new User({
        email: profile.email.toLowerCase(),
        name: profile.name || profile.nickname,
        auth0Id: profile.oauthId,
        avatarUrl: profile.picture,
        auth0Profile: {
          auth0Id: profile.oauthId,
          email: profile.email,
          emailVerified: profile.emailVerified,
          name: profile.name,
          nickname: profile.nickname,
          picture: profile.picture,
          locale: profile.locale,
          updatedAt: profile.updatedAt,
          connection: providerName,
          provider: providerName,
          rawProfile: profile.rawProfile,
        },
        authMethods: [AuthProviderType.AUTH0],
        isEmailVerified: profile.emailVerified,
        isActive: false,
        isBanned: false,
      }),
    );
  }

  async _enrichExistingUser(user, profile) {
    const updates = {};

    if (!user.auth0Id) {
      updates.auth0Id = profile.oauthId;
    }
    if (!user.hasAuthMethod(AuthProviderType.AUTH0)) {
      user.addAuthMethod(AuthProviderType.AUTH0);
      updates.authMethods = user.authMethods;
    }

    const base = user.auth0Profile ?? {};
    updates.auth0Profile = {
      ...base,
      auth0Id: profile.oauthId,
      email: profile.email,
      emailVerified: profile.emailVerified,
      rawProfile: profile.rawProfile,
      picture: base.picture || profile.picture || null,
      updatedAt: base.updatedAt || profile.updatedAt || null,
    };

    if (!user.avatarUrl && profile.picture) {
      updates.avatarUrl = profile.picture;
    }
    if (!user.name && (profile.name || profile.nickname)) {
      updates.name = profile.name || profile.nickname;
    }
    if (!user.isEmailVerified && profile.emailVerified) {
      updates.isEmailVerified = true;
    }

    return this.userRepository.update(user.id, updates);
  }
}

module.exports = Auth0Strategy;
