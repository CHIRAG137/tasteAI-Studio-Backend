'use strict';

const IAuthProvider = require('../../domain/providers/IAuthProvider');
const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');
const InvalidCredentialsException = require('../../domain/exceptions/InvalidCredentialsException');
const AuthException = require('../../domain/exceptions/AuthException');

/**
 * Email + password authentication provider.
 *
 * Depends on IUserRepository and IPasswordHasher (both injected),
 * keeping this class free of direct Mongoose or bcrypt imports.
 */
class EmailPasswordAuthProvider extends IAuthProvider {
  /**
   * @param {import('../../domain/repositories/IUserRepository')} userRepository
   * @param {import('../../domain/services/IPasswordHasher')} passwordHasher
   */
  constructor(userRepository, passwordHasher) {
    super();
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
  }

  getType() {
    return AuthProviderTypes.EMAIL_PASSWORD;
  }

  async authenticate(command) {
    const user = await this.userRepository.findByEmailWithPassword(command.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Account exists but was created via OAuth — no password set
    if (!user.password) {
      throw new AuthException(
        'This email is registered via Google or Auth0. Please use your original sign-in method.',
        'OAUTH_ONLY_ACCOUNT',
      );
    }

    const isValid = await this.passwordHasher.compare(command.password, user.password);
    if (!isValid) {
      throw new InvalidCredentialsException();
    }

    return user;
  }
}

module.exports = EmailPasswordAuthProvider;
