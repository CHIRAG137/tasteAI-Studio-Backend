'use strict';

const EmbeddedServiceStrategy = require('./EmbeddedServiceStrategy');
const ProxyServiceStrategy = require('./ProxyServiceStrategy');
const { SERVICE_REGISTRY } = require('./ServiceRegistry');
const { env } = require('../env');

/**
 * createServiceIntegrationStrategy — resolves the correct strategy for a
 * given service key.
 *
 * Fully generic — no service-specific knowledge lives here. The registry
 * entry provides everything: the createModule factory, the env var names
 * for mode and target URL.
 */
function createServiceIntegrationStrategy(serviceKey) {
  const config = SERVICE_REGISTRY[serviceKey];
  if (!config) {
    throw new Error(`Unknown service: "${serviceKey}"`);
  }

  const mode = (env[config.envModeKey] || 'embedded').toLowerCase();

  if (mode === 'embedded') {
    // Pass the registry's createModule factory — EmbeddedServiceStrategy
    // calls it at mount time. This is what was missing before.
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
