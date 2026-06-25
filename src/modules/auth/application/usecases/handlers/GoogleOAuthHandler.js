'use strict';

const User = require('../../../domain/User');
const AuthProviderTypes = require('../../../infrastructure/providers/AuthProviderTypes');
const { ForbiddenException } = require('../../../../shared/exceptions');
const AuthResponseMapper = require('../../mappers/AuthResponseMapper');
const logger = require('../../../../shared/logging');

class GoogleOAuthHandler {
  constructor({ userRepository, tokenService, qrService, eventBus }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.qrService = qrService;
    this.eventBus = eventBus;
  }

  async handle({ profile }, command) {
    const {
      sub: googleId,
      email,
      name,
      given_name: givenName,
      family_name: familyName,
      picture,
      locale,
      hd: hostedDomain,
      email_verified: emailVerified,
    } = profile;

    const user = await this.userRepository.findByOAuthOrEmail({ email, googleId });

    if (!user) {
      return this._handleNewUser({
        googleId,
        email,
        name,
        givenName,
        familyName,
        picture,
        locale,
        emailVerified,
        hostedDomain,
        profile,
      });
    }

    return this._handleExistingUser(
      user,
      {
        googleId,
        email,
        name,
        givenName,
        familyName,
        picture,
        locale,
        emailVerified,
        hostedDomain,
        profile,
      },
      command,
    );
  }

  async _handleNewUser(data) {
    const user = await this.userRepository.create(
      new User({
        email: data.email.toLowerCase(),
        name: data.name,
        googleId: data.googleId,
        googleProfile: {
          googleId: data.googleId,
          email: data.email,
          name: data.name,
          givenName: data.givenName,
          familyName: data.familyName,
          picture: data.picture,
          locale: data.locale,
          emailVerified: Boolean(data.emailVerified),
          hostedDomain: data.hostedDomain,
          rawProfile: data.profile,
        },
        avatarUrl: data.picture,
        authMethods: [AuthProviderTypes.GOOGLE],
        isEmailVerified: Boolean(data.emailVerified),
        isActive: false,
        isBanned: false,
      }),
    );

    const qr = await this._createQrSession(user.id);
    logger.info('New Google user — awaiting QR activation', { userId: user.id, email: data.email });

    return AuthResponseMapper.qrRequired(user, qr.sessionId, qr.qrDataUrl, qr.expiresAt);
  }

  async _handleExistingUser(user, data, command) {
    const enriched = await this._enrichProfile(user, data);

    if (!enriched.isActive) {
      throw new ForbiddenException(
        'Account not yet activated. Please complete mobile QR verification.',
      );
    }

    const tokens = await this.tokenService.issue(enriched, AuthProviderTypes.GOOGLE, {
      ip: command.ip,
      device: command.userAgent,
      deviceId: command.deviceId,
    });

    return { ...AuthResponseMapper.tokens(enriched, tokens), isNew: false };
  }

  async _createQrSession(userId) {
    const { sessionId, qrDataUrl, expiresAt } = await this.qrService.createSession(userId);
    await this.userRepository.update(userId, { pendingQr: { sessionId, expiresAt } });
    return { sessionId, qrDataUrl, expiresAt };
  }

  async _enrichProfile(user, data) {
    const updates = {};

    if (!user.googleId) {
      updates.googleId = data.googleId;
    }
    if (!user.hasAuthMethod(AuthProviderTypes.GOOGLE)) {
      user.addAuthMethod(AuthProviderTypes.GOOGLE);
      updates.authMethods = user.authMethods;
    }

    const base = user.googleProfile ?? {};
    updates.googleProfile = {
      ...base,
      googleId: data.googleId,
      email: data.email,
      name: data.name,
      rawProfile: data.profile,
      givenName: base.givenName || data.givenName || null,
      familyName: base.familyName || data.familyName || null,
      picture: base.picture || data.picture || null,
    };

    if (!user.avatarUrl && data.picture) {
      updates.avatarUrl = data.picture;
    }
    if (!user.name && data.name) {
      updates.name = data.name;
    }
    if (!user.isEmailVerified && data.emailVerified) {
      updates.isEmailVerified = true;
    }

    return this.userRepository.update(user.id, updates);
  }
}

module.exports = GoogleOAuthHandler;
