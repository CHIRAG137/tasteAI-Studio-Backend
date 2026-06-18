'use strict';

/**
 * Command object for QR code verification.
 * Immutable — frozen after construction to prevent accidental mutation.
 */
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
