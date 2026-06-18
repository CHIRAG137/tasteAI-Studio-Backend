'use strict';

const { env } = require('../../../../config/env');

/**
 * Builds the mobile deep link encoded in the QR code.
 * Reads the base URL from the central env config instead of process.env directly.
 *
 * @param {string} sessionId
 * @returns {string}
 */
function buildDeepLink(sessionId) {
  return `${env.MOBILE_DEEP_LINK_BASE}?sessionId=${encodeURIComponent(sessionId)}`;
}

module.exports = { buildDeepLink };
