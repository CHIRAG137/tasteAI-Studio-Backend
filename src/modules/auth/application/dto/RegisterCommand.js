'use strict';

class RegisterCommand {
  constructor({ email, password, name, ip, userAgent }) {
    this.email = email;
    this.password = password;
    this.name = name;
    this.ip = ip;
    this.userAgent = userAgent;
    Object.freeze(this);
  }
}

module.exports = RegisterCommand;
