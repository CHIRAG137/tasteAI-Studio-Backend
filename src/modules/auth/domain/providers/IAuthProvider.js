'use strict';

/**
 * Abstract interface for all authentication providers.
 *
 * Implementations: EmailPasswordAuthProvider, GoogleAuthProvider, Auth0AuthProvider
 * The domain layer depends only on this interface — concrete implementations live in
 * the infrastructure layer (Dependency Inversion Principle).
 */
class IAuthProvider {
  /**
   * Returns the provider type identifier used for registration in AuthProviderFactory.
   * @returns {string}
   * @abstract
   */
  getType() {
    throw new Error(`${this.constructor.name}.getType() not implemented`);
  }

  /**
   * Authenticates the given credentials and returns provider-specific profile data.
   * @param {object} credentials - Provider-specific credentials object
   * @returns {Promise<object>} - Provider-specific authentication result
   * @abstract
   */

  async authenticate(credentials) {
    throw new Error(`${this.constructor.name}.authenticate() not implemented`);
  }
}

module.exports = IAuthProvider;
