'use strict';

const AuthStrategy = require('./AuthStrategy');
const AuthProviderType = require('./AuthProviderType');
const User = require('../../../domain/User');
const {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  AppException,
} = require('../../../../shared/exceptions');
const AuthResponseMapper = require('../../../application/mappers/AuthResponseMapper');
const logger = require('../../../../shared/logging');

class EmailPasswordStrategy extends AuthStrategy {
  constructor({
    userRepository,
    passwordHasher,
    tokenService,
    verificationService,
    verificationType,
  }) {
    super();
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
    this.verificationService = verificationService;
    this.verificationType = verificationType || 'qr';
  }

  getType() {
    return AuthProviderType.EMAIL_PASSWORD;
  }

  async authenticate(command) {
    const user = await this.userRepository.findByEmailWithPassword(command.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password', 'INVALID_CREDENTIALS');
    }
    if (!user.password) {
      throw new AppException({
        message:
          'This email is registered via Google or Auth0. Please use your original sign-in method.',
        code: 'OAUTH_ONLY_ACCOUNT',
        statusCode: 401,
      });
    }
    const isValid = await this.passwordHasher.compare(command.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password', 'INVALID_CREDENTIALS');
    }
    return user;
  }

  async login(command) {
    const user = await this.authenticate(command);

    if (!user.isActive) {
      throw new ForbiddenException('Account not activated. Please complete account verification.');
    }
    if (user.isBanned) {
      throw new ForbiddenException('Account suspended');
    }

    const tokens = await this.tokenService.issue(user, AuthProviderType.EMAIL_PASSWORD, {
      ip: command.ip,
      device: command.userAgent,
      deviceId: command.deviceId,
    });

    return AuthResponseMapper.tokens(user, tokens);
  }

  async register(command) {
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

    if (!existingUser.hasAuthMethod(AuthProviderType.EMAIL_PASSWORD)) {
      existingUser.addAuthMethod(AuthProviderType.EMAIL_PASSWORD);
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
        authMethods: [AuthProviderType.EMAIL_PASSWORD],
        isActive: false,
        isBanned: false,
      }),
    );

    const verification = await this.verificationService.createVerification(
      user.id,
      this.verificationType,
    );
    await this.userRepository.update(user.id, {
      pendingQr: { sessionId: verification.sessionId, expiresAt: verification.expiresAt },
    });

    logger.info('User registered — awaiting activation', {
      userId: user.id,
      email,
      verificationType: this.verificationType,
    });

    return AuthResponseMapper.registration(
      user.id,
      verification.sessionId,
      verification.qrDataUrl,
      verification.expiresAt,
    );
  }
}

module.exports = EmailPasswordStrategy;
