'use strict';

const OAuthStrategy = require('./OAuthStrategy');
const AuthProviderType = require('./AuthProviderType');
const User = require('../../../domain/User');
const { UnauthorizedException } = require('../../../../shared/exceptions');

class GoogleStrategy extends OAuthStrategy {
  constructor({ userRepository, tokenService, verificationService, eventBus, googleOAuthClient }) {
    super({ userRepository, tokenService, verificationService, eventBus });
    this.googleOAuthClient = googleOAuthClient;
  }

  getType() {
    return AuthProviderType.GOOGLE;
  }

  get oauthIdField() {
    return 'googleId';
  }

  async authenticate(command) {
    const { token } = command;
    if (!token) {
      throw new UnauthorizedException('Google token is required', 'INVALID_TOKEN');
    }

    let profile;
    try {
      profile = await this.googleOAuthClient.verifyIdToken(token);
    } catch {
      const fetch = require('node-fetch');
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        throw new UnauthorizedException('Invalid Google token', 'INVALID_TOKEN');
      }
      profile = await resp.json();
    }

    return { profile };
  }

  _extractProfile(authResult) {
    const p = authResult.profile;
    return {
      oauthId: p.sub,
      email: p.email,
      name: p.name,
      givenName: p.given_name,
      familyName: p.family_name,
      picture: p.picture,
      locale: p.locale,
      emailVerified: Boolean(p.email_verified),
      hostedDomain: p.hd,
      rawProfile: p,
    };
  }

  async _createUserFromProfile(profile) {
    return this.userRepository.create(
      new User({
        email: profile.email.toLowerCase(),
        name: profile.name,
        googleId: profile.oauthId,
        googleProfile: {
          googleId: profile.oauthId,
          email: profile.email,
          name: profile.name,
          givenName: profile.givenName,
          familyName: profile.familyName,
          picture: profile.picture,
          locale: profile.locale,
          emailVerified: profile.emailVerified,
          hostedDomain: profile.hostedDomain,
          rawProfile: profile.rawProfile,
        },
        avatarUrl: profile.picture,
        authMethods: [AuthProviderType.GOOGLE],
        isEmailVerified: profile.emailVerified,
        isActive: false,
        isBanned: false,
      }),
    );
  }

  async _enrichExistingUser(user, profile) {
    const updates = {};

    if (!user.googleId) {
      updates.googleId = profile.oauthId;
    }
    if (!user.hasAuthMethod(AuthProviderType.GOOGLE)) {
      user.addAuthMethod(AuthProviderType.GOOGLE);
      updates.authMethods = user.authMethods;
    }

    const base = user.googleProfile ?? {};
    updates.googleProfile = {
      ...base,
      googleId: profile.oauthId,
      email: profile.email,
      name: profile.name,
      rawProfile: profile.rawProfile,
      givenName: base.givenName || profile.givenName || null,
      familyName: base.familyName || profile.familyName || null,
      picture: base.picture || profile.picture || null,
    };

    if (!user.avatarUrl && profile.picture) {
      updates.avatarUrl = profile.picture;
    }
    if (!user.name && profile.name) {
      updates.name = profile.name;
    }
    if (!user.isEmailVerified && profile.emailVerified) {
      updates.isEmailVerified = true;
    }

    return this.userRepository.update(user.id, updates);
  }
}

module.exports = GoogleStrategy;
