'use strict';

const ServiceIntegrationStrategy = require('./ServiceIntegrationStrategy');

/**
 * EmbeddedServiceStrategy — mounts ANY module's router in-process.
 *
 * Receives the module factory function (createModule) from the registry
 * at construction time and calls it at mount time. Has zero knowledge of
 * which specific module it is mounting — auth, chatbot, or anything else.
 */
class EmbeddedServiceStrategy extends ServiceIntegrationStrategy {
  /**
   * @param {Function} createModule — factory function from the registry entry
   */
  constructor(createModule) {
    super();
    this._createModule = createModule;
  }

  mount(app, mountPath) {
    const module = this._createModule();
    app.use(mountPath, module.router);
    console.log(`[registry] EMBEDDED — mounted at ${mountPath}`);
    return module;
  }
}

module.exports = EmbeddedServiceStrategy;
