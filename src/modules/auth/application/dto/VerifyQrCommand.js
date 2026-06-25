'use strict';

class VerifyQrCommand {
  constructor({ sessionId, phoneNumber, countryCode, deviceInfo }) {
    this.sessionId = sessionId;
    this.phoneNumber = phoneNumber;
    this.countryCode = countryCode;
    this.deviceInfo = deviceInfo;
    Object.freeze(this);
  }
}

module.exports = VerifyQrCommand;
