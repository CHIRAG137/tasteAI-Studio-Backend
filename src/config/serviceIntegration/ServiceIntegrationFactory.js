'use strict';

const EmbeddedServiceStrategy = require('./EmbeddedServiceStrategy');
const ProxyServiceStrategy = require('./ProxyServiceStrategy');
const { SERVICE_REGISTRY } = require('./serviceRegistry');
const { env } = require('../env');

/**
 * Builds the integration strategy for a given registered service key.
 * Works identically for auth, notifications, or any future service —
 * no per-feature branching required.
 */
function createServiceIntegrationStrategy(serviceKey) {
  const config = SERVICE_REGISTRY[serviceKey];
  if (!config) {
    throw new Error(`Unknown service: "${serviceKey}"`);
  }

  const mode = (env[config.envModeKey] || 'embedded').toLowerCase();

  if (mode === 'embedded') {
    return new EmbeddedServiceStrategy(config.createModule);
  }
  if (mode === 'remote') {
    const targetUrl = env[config.envUrlKey];
    if (!targetUrl) {
      throw new Error(`${config.envUrlKey} is required when ${config.envModeKey}=remote`);
    }
    return new ProxyServiceStrategy(targetUrl);
  }
  throw new Error(`Unknown mode "${mode}" for service "${serviceKey}"`);
}

module.exports = { createServiceIntegrationStrategy };
