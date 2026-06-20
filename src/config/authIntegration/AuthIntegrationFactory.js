'use strict';

const EmbeddedAuthStrategy = require('./EmbeddedAuthStrategy');
const ProxyAuthStrategy = require('./ProxyAuthStrategy');
const { env } = require('../env');

function createAuthIntegrationStrategy() {
  switch (env.AUTH_MODE) {
    case 'embedded':
      return new EmbeddedAuthStrategy();
    case 'remote':
      return new ProxyAuthStrategy(env.AUTH_SERVICE_URL);
    default:
      // unreachable — validateEnv() already guarantees this, but kept for safety
      throw new Error(`Unknown AUTH_MODE: "${env.AUTH_MODE}"`);
  }
}

module.exports = { createAuthIntegrationStrategy };
