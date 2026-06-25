'use strict';

const AuthProviderTypes = require('./AuthProviderTypes');
const { UnauthorizedException, AppException } = require('../../../shared/exceptions');

class EmailPasswordAuthProvider {
  constructor(userRepository, passwordHasher) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  getType() {
    return AuthProviderTypes.EMAIL_PASSWORD;
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
}

module.exports = EmailPasswordAuthProvider;
