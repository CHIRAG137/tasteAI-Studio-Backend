'use strict';

/**
 * Strategy interface for integrating the Auth module into the host app.
 * Any new integration mode (embedded, proxy, gRPC...) implements this contract.
 * Consumers (index.js) only depend on this abstraction — Open/Closed Principle.
 */
class ServiceIntegrationStrategy {
  /**
   * @param {import('express').Express} app
   * @param {string} mountPath e.g. '/api/auth/user'
   */

  mount(app, mountPath) {
    throw new Error('mount() must be implemented by subclass');
  }
}

module.exports = ServiceIntegrationStrategy;
