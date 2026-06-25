'use strict';

const User = require('../../../domain/User');
const AuthProviderTypes = require('../../../infrastructure/providers/AuthProviderTypes');
const { ForbiddenException } = require('../../../../shared/exceptions');
const AuthResponseMapper = require('../../mappers/AuthResponseMapper');
const logger = require('../../../../shared/logging');

class Auth0OAuthHandler {
  constructor({ userRepository, tokenService, qrService, eventBus }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.qrService = qrService;
    this.eventBus = eventBus;
  }

  async handle({ profile, auth0Id, email }, command) {
    const {
      name,
      nickname,
      picture,
      locale,
      updated_at: updatedAt,
      email_verified: emailVerified,
    } = profile;

    const user = await this.userRepository.findByOAuthOrEmail({ email, auth0Id });

    if (!user) {
      return this._handleNewUser({
        auth0Id,
        email,
        name,
        nickname,
        picture,
        locale,
        updatedAt,
        emailVerified,
        profile,
      });
    }

    return this._handleExistingUser(
      user,
      { auth0Id, email, name, nickname, picture, locale, updatedAt, emailVerified, profile },
      command,
    );
  }

  async _handleNewUser(data) {
    const [providerName] = data.auth0Id.split('|');
    const user = await this.userRepository.create(
      new User({
        email: data.email.toLowerCase(),
        name: data.name || data.nickname,
        auth0Id: data.auth0Id,
        avatarUrl: data.picture,
        auth0Profile: {
          auth0Id: data.auth0Id,
          email: data.email,
          emailVerified: Boolean(data.emailVerified),
          name: data.name,
          nickname: data.nickname,
          picture: data.picture,
          locale: data.locale,
          updatedAt: data.updatedAt,
          connection: providerName,
          provider: providerName,
          rawProfile: data.profile,
        },
        authMethods: [AuthProviderTypes.AUTH0],
        isEmailVerified: Boolean(data.emailVerified),
        isActive: false,
        isBanned: false,
      }),
    );

    const qr = await this._createQrSession(user.id);
    logger.info('New Auth0 user — awaiting QR activation', {
      userId: user.id,
      email: data.email,
      auth0Id: data.auth0Id,
    });

    return AuthResponseMapper.qrRequired(user, qr.sessionId, qr.qrDataUrl, qr.expiresAt);
  }

  async _handleExistingUser(user, data, command) {
    const enriched = await this._enrichProfile(user, data);

    if (!enriched.isActive) {
      throw new ForbiddenException(
        'Account not yet activated. Please complete mobile QR verification.',
      );
    }

    const tokens = await this.tokenService.issue(enriched, AuthProviderTypes.AUTH0, {
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

    if (!user.auth0Id) {
      updates.auth0Id = data.auth0Id;
    }
    if (!user.hasAuthMethod(AuthProviderTypes.AUTH0)) {
      user.addAuthMethod(AuthProviderTypes.AUTH0);
      updates.authMethods = user.authMethods;
    }

    const base = user.auth0Profile ?? {};
    updates.auth0Profile = {
      ...base,
      auth0Id: data.auth0Id,
      email: data.email,
      emailVerified: Boolean(data.emailVerified),
      rawProfile: data.profile,
      picture: base.picture || data.picture || null,
      updatedAt: base.updatedAt || data.updatedAt || null,
    };

    if (!user.avatarUrl && data.picture) {
      updates.avatarUrl = data.picture;
    }
    if (!user.name && (data.name || data.nickname)) {
      updates.name = data.name || data.nickname;
    }
    if (!user.isEmailVerified && data.emailVerified) {
      updates.isEmailVerified = true;
    }

    return this.userRepository.update(user.id, updates);
  }
}

module.exports = Auth0OAuthHandler;
