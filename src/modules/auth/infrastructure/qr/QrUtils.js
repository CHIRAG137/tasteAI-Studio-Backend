'use strict';

const { env } = require('../../../../config/env');

function buildDeepLink(sessionId) {
  return `${env.MOBILE_DEEP_LINK_BASE}?sessionId=${encodeURIComponent(sessionId)}`;
}

module.exports = { buildDeepLink };
