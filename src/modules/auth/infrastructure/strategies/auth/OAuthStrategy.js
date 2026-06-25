'use strict';

const AuthStrategy = require('./AuthStrategy');
const { ForbiddenException } = require('../../../../shared/exceptions');
const AuthResponseMapper = require('../../../application/mappers/AuthResponseMapper');
const logger = require('../../../../shared/logging');

class OAuthStrategy extends AuthStrategy {
  constructor({ userRepository, tokenService, verificationService, eventBus, verificationType }) {
    super();
    this.userRepository = userRepository;
    this.tokenService = tokenService;
    this.verificationService = verificationService;
    this.eventBus = eventBus;
    this.verificationType = verificationType || 'qr';
  }

  get oauthIdField() {
    throw new Error(`${this.constructor.name}.oauthIdField not implemented`);
  }

  async login(command) {
    const authResult = await this.authenticate(command);
    const profile = this._extractProfile(authResult);

    const lookup = { email: profile.email, [this.oauthIdField]: profile.oauthId };
    const user = await this.userRepository.findByOAuthOrEmail(lookup);

    if (!user) {
      const newUser = await this._createUserFromProfile(profile);
      return this._handleNewUserFlow(newUser, command);
    }

    const enriched = await this._enrichExistingUser(user, profile);
    return this._handleExistingUserFlow(enriched, command);
  }

  _extractProfile(authResult) {
    throw new Error(`${this.constructor.name}._extractProfile() not implemented`);
  }

  async _createUserFromProfile(profile) {
    throw new Error(`${this.constructor.name}._createUserFromProfile() not implemented`);
  }

  async _enrichExistingUser(user, profile) {
    throw new Error(`${this.constructor.name}._enrichExistingUser() not implemented`);
  }

  async _handleNewUserFlow(user, command) {
    const verification = await this.verificationService.createVerification(
      user.id,
      this.verificationType,
    );
    await this.userRepository.update(user.id, {
      pendingQr: { sessionId: verification.sessionId, expiresAt: verification.expiresAt },
    });

    logger.info('New OAuth user — awaiting activation', {
      userId: user.id,
      email: user.email,
      method: this.getType(),
      verificationType: this.verificationType,
    });

    return AuthResponseMapper.qrRequired(
      user,
      verification.sessionId,
      verification.qrDataUrl,
      verification.expiresAt,
    );
  }

  async _handleExistingUserFlow(user, command) {
    if (!user.isActive) {
      throw new ForbiddenException(
        'Account not yet activated. Please complete account verification.',
      );
    }
    if (user.isBanned) {
      throw new ForbiddenException('Account suspended');
    }

    const tokens = await this.tokenService.issue(user, this.getType(), {
      ip: command.ip,
      device: command.userAgent,
      deviceId: command.deviceId,
    });

    return { ...AuthResponseMapper.tokens(user, tokens), isNew: false };
  }
}

module.exports = OAuthStrategy;
