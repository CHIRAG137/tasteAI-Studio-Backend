'use strict';

class LoginCommand {
  constructor({ provider, email, password, token, accessToken, deviceId, ip, userAgent }) {
    this.provider = provider;
    this.email = email;
    this.password = password;
    this.token = token;
    this.accessToken = accessToken;
    this.deviceId = deviceId;
    this.ip = ip;
    this.userAgent = userAgent;
    Object.freeze(this);
  }
}

module.exports = LoginCommand;
