'use strict';

class User {
  constructor(props) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.avatarUrl = props.avatarUrl;
    this.password = props.password;
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

  hasAuthMethod(method) {
    return this.authMethods.includes(method);
  }

  addAuthMethod(method) {
    if (!this.hasAuthMethod(method)) {
      this.authMethods.push(method);
    }
  }

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
