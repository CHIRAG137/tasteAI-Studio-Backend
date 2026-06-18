'use strict';

/**
 * Redis key scheme for QR sessions.
 *
 * Centralises all Redis key construction so key formats can be changed in one place.
 * Consumers import this object instead of hard-coding key strings.
 */
const qrKeyScheme = Object.freeze({
  /** Tracks which userId a QR session belongs to */
  session: (sessionId) => `qr:session:${sessionId}`,

  /** Set when the QR has been scanned; prevents double-scan attacks */
  scanned: (sessionId) => `qr:scanned:${sessionId}`,

  /** Maps phone number → userId for duplicate-phone detection */
  phone: (phoneNumber) => `qr:phone:${phoneNumber}`,
});

module.exports = qrKeyScheme;
