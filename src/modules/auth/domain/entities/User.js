'use strict';

const UserInactiveException = require('../exceptions/UserInactiveException');
const UserBannedException = require('../exceptions/UserBannedException');

/**
 * Domain entity representing an authenticated user.
 *
 * Contains only business logic — no persistence or framework concerns.
 * Persistence mapping is handled by UserMapper in the infrastructure layer.
 */
class User {
  constructor(props) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.avatarUrl = props.avatarUrl;
    this.password = props.password; // hashed; only present when explicitly selected

    this.isActive = props.isActive;
    this.isBanned = props.isBanned;
    this.isEmailVerified = props.isEmailVerified ?? false;
    this.banReason = props.banReason;

    this.authMethods = props.authMethods || [];
    this.googleId = props.googleId;
    this.auth0Id = props.auth0Id;
    this.googleProfile = props.googleProfile;
    this.auth0Profile = props.auth0Profile;
    this.phone = props.phone;
    this.pendingQr = props.pendingQr;

    this.lastLogin = props.lastLogin || null;
    this.lastLogoutAt = props.lastLogoutAt || null;
    this.refreshTokenFamily = props.refreshTokenFamily || null;

    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Asserts the user is in a state that allows login.
   * Throws a domain exception if any condition fails.
   *
   * @throws {UserInactiveException} if QR verification is pending
   * @throws {UserBannedException} if account is banned
   * @returns {this} for chaining
   */
  isEligibleToLogin() {
    if (!this.isActive) {
      throw new UserInactiveException(
        'Account not activated. Please complete mobile QR verification.',
      );
    }
    if (this.isBanned) {
      throw new UserBannedException();
    }
    return this;
  }

  /**
   * Checks whether the user has a specific authentication method linked.
   * @param {string} method - Auth method (e.g. 'email_password', 'google', 'auth0')
   * @returns {boolean}
   */
  hasAuthMethod(method) {
    return this.authMethods.includes(method);
  }

  /**
   * Links an auth method to this user if not already present.
   * @param {string} method
   */
  addAuthMethod(method) {
    if (!this.hasAuthMethod(method)) {
      this.authMethods.push(method);
    }
  }

  /**
   * Returns a safe, frozen public profile suitable for API responses.
   * Sensitive fields (password, refreshTokenFamily, pendingQr) are excluded.
   *
   * @returns {Readonly<object>}
   */
  toPublicProfile() {
    return Object.freeze({
      id: this.id,
      email: this.email,
      name: this.name,
      avatarUrl: this.avatarUrl,
      authMethods: [...this.authMethods],
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      phone: this.phone,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}

module.exports = User;
