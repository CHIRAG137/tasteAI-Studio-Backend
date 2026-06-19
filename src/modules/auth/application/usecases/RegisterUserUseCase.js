'use strict';

const BaseUseCase = require('../../../shared/usecases/BaseUseCase');
const User = require('../../domain/entities/User');
const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');
const UserRegisteredEvent = require('../../domain/events/UserRegisteredEvent');
const AccountExistsException = require('../../domain/exceptions/AccountExistsException');
const AuthResponseMapper = require('../mapper/AuthResponseMapper');
const logger = require('../../../shared/logging');

/**
 * Handles new user registration via email + password.
 *
 * Flow:
 *   1. If email exists with a password → reject (AccountExists)
 *   2. If email exists via OAuth only → link password to existing account
 *   3. Otherwise → create new user, generate QR session for mobile verification
 */
class RegisterUserUseCase extends BaseUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/repositories/IUserRepository')} deps.userRepository
   * @param {import('../../domain/services/IQrService')} deps.qrService
   * @param {import('../../domain/services/IEventBus')} deps.eventBus
   * @param {import('../../domain/services/IPasswordHasher')} deps.passwordHasher
   */
  constructor({ userRepository, qrService, eventBus, passwordHasher }) {
    super();
    this.userRepository = userRepository;
    this.qrService = qrService;
    this.eventBus = eventBus;
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

  /**
   * @private
   * Handles registration when a user with this email already exists.
   * Either links the password to an OAuth-only account, or throws if already registered.
   */
  async _handleExistingUser(existingUser, email, command) {
    const userWithPwd = await this.userRepository.findByEmailWithPassword(email);

    // Already has a password → account fully exists → reject
    if (userWithPwd?.password) {
      throw new AccountExistsException();
    }

    // OAuth-only account → link password
    if (!existingUser.hasAuthMethod(AuthProviderTypes.EMAIL_PASSWORD)) {
      existingUser.addAuthMethod(AuthProviderTypes.EMAIL_PASSWORD);
      const hashedPassword = await this.passwordHasher.hash(command.password);

      await this.userRepository.update(existingUser.id, {
        password: hashedPassword,
        authMethods: existingUser.authMethods,
        ...(command.name && !existingUser.name ? { name: command.name } : {}),
      });

      this.eventBus.publish(new UserRegisteredEvent(existingUser.id));
      logger.info('Password linked to existing OAuth account', {
        userId: existingUser.id,
        email,
      });

      return AuthResponseMapper.linked(existingUser.id);
    }

    throw new AccountExistsException();
  }

  /**
   * @private
   * Creates a brand-new user and generates a QR session for mobile activation.
   */
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

    this.eventBus.publish(new UserRegisteredEvent(user.id));
    logger.info('User registered — awaiting QR activation', { userId: user.id, email });

    return AuthResponseMapper.registration(user.id, sessionId, qrDataUrl, expiresAt);
  }
}

module.exports = RegisterUserUseCase;
