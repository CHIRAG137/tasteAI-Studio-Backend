'use strict';

const { createProxyMiddleware } = require('http-proxy-middleware');
const ServiceIntegrationStrategy = require('./ServiceIntegrationStrategy');

/**
 * ProxyServiceStrategy — forwards ALL traffic under a mount path to an
 * independently deployed service over HTTP.
 *
 * Generic — works for any service. Has zero knowledge of which specific
 * module it is proxying.
 */
class ProxyServiceStrategy extends ServiceIntegrationStrategy {
  /**
   * @param {string} targetUrl — the deployed service URL from env
   */
  constructor(targetUrl) {
    super();
    if (!targetUrl) {
      throw new Error('ProxyServiceStrategy: targetUrl is required');
    }
    this._targetUrl = targetUrl;
  }

  mount(app, mountPath) {
    app.use(
      mountPath,
      createProxyMiddleware({
        target: this._targetUrl,
        changeOrigin: true,
        logLevel: 'warn',
      }),
    );
    console.log(`[registry] REMOTE — proxying ${mountPath} -> ${this._targetUrl}`);
    return null;
  }
}

module.exports = ProxyServiceStrategy;
