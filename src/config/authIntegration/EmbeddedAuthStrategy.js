'use strict';

const AuthIntegrationStrategy = require('./AuthIntegrationStrategy');
const { createAuthModule } = require('../../modules/auth');

/**
 * Runs auth in-process. Used for local development / single-process deploys.
 * Single responsibility: wire the auth module's own router into the host app.
 */
class EmbeddedAuthStrategy extends AuthIntegrationStrategy {
  mount(app, mountPath) {
    const authModule = createAuthModule();
    app.use(mountPath, authModule.router);
    console.log(`[auth] EMBEDDED mode — mounted locally at ${mountPath}`);
    return authModule; // exposed in case other routes need authMiddleware
  }
}

module.exports = EmbeddedAuthStrategy;
