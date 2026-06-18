'use strict';

const AuthException = require('./AuthException');

/** Thrown when a QR session is expired, already used, or invalid. */
class QrSessionException extends AuthException {
  constructor(message = 'QR session error') {
    super(message, 'QR_SESSION_ERROR');
  }
}

module.exports = QrSessionException;
