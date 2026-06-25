'use strict';

const User = require('../../domain/User');
const AuthProviderTypes = require('../../infrastructure/providers/AuthProviderTypes');
const { ConflictException } = require('../../../shared/exceptions');
const AuthResponseMapper = require('../mappers/AuthResponseMapper');
const logger = require('../../../shared/logging');

class RegisterUserUseCase {
  constructor({ userRepository, qrService, passwordHasher }) {
    this.userRepository = userRepository;
    this.qrService = qrService;
    this.passwordHasher = passwordHasher;
  }

  async execute(command) {
    const email = command.email.toLowerCase();
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      return this._handleExistingUser(existingUser, email, command);
    }

    return this._createNewUser(email, command);
  }

  async _handleExistingUser(existingUser, email, command) {
    const userWithPwd = await this.userRepository.findByEmailWithPassword(email);

    if (userWithPwd?.password) {
      throw new ConflictException('An account with this email already exists', 'ACCOUNT_EXISTS');
    }

    if (!existingUser.hasAuthMethod(AuthProviderTypes.EMAIL_PASSWORD)) {
      existingUser.addAuthMethod(AuthProviderTypes.EMAIL_PASSWORD);
      const hashedPassword = await this.passwordHasher.hash(command.password);

      await this.userRepository.update(existingUser.id, {
        password: hashedPassword,
        authMethods: existingUser.authMethods,
        ...(command.name && !existingUser.name ? { name: command.name } : {}),
      });

      logger.info('Password linked to existing OAuth account', { userId: existingUser.id, email });

      return AuthResponseMapper.linked(existingUser.id);
    }

    throw new ConflictException('An account with this email already exists', 'ACCOUNT_EXISTS');
  }

  async _createNewUser(email, command) {
    const hashedPassword = await this.passwordHasher.hash(command.password);

    const user = await this.userRepository.create(
      new User({
        email,
        password: hashedPassword,
        name: command.name,
        authMethods: [AuthProviderTypes.EMAIL_PASSWORD],
        isActive: false,
        isBanned: false,
      }),
    );

    const { sessionId, qrDataUrl, expiresAt } = await this.qrService.createSession(user.id);

    await this.userRepository.update(user.id, {
      pendingQr: { sessionId, expiresAt },
    });

    logger.info('User registered — awaiting QR activation', { userId: user.id, email });

    return AuthResponseMapper.registration(user.id, sessionId, qrDataUrl, expiresAt);
  }
}

module.exports = RegisterUserUseCase;
