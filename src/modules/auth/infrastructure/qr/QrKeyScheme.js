'use strict';

const qrKeyScheme = Object.freeze({
  session: (sessionId) => `qr:session:${sessionId}`,
  scanned: (sessionId) => `qr:scanned:${sessionId}`,
  phone: (phoneNumber) => `qr:phone:${phoneNumber}`,
});

module.exports = qrKeyScheme;
