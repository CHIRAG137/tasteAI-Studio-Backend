'use strict';

/**
 * Command object for login operations.
 * Immutable — frozen after construction to prevent accidental mutation.
 */
class LoginCommand {
  constructor({ provider, email, password, token, accessToken, deviceId, ip, userAgent }) {
    this.provider = provider;
    this.email = email;
    this.password = password;
    this.token = token; // Google ID token
    this.accessToken = accessToken; // Auth0 access token
    this.deviceId = deviceId;
    this.ip = ip;
    this.userAgent = userAgent;
    Object.freeze(this);
  }
}

module.exports = LoginCommand;
