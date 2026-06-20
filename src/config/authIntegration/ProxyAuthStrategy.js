'use strict';

const { createProxyMiddleware } = require('http-proxy-middleware');
const AuthIntegrationStrategy = require('./AuthIntegrationStrategy');

/**
 * Forwards all auth traffic to an independently deployed auth service
 * (e.g. https://tastebot-auth.onrender.com). Used in production when
 * auth is scaled/deployed separately on Render.
 */
class ProxyAuthStrategy extends AuthIntegrationStrategy {
  constructor(targetUrl) {
    super();
    if (!targetUrl) {
      throw new Error('AUTH_SERVICE_URL is required when AUTH_MODE=remote');
    }
    this.targetUrl = targetUrl;
  }

  mount(app, mountPath) {
    app.use(
      mountPath,
      createProxyMiddleware({
        target: this.targetUrl,
        changeOrigin: true,
        pathRewrite: { [`^${mountPath}`]: mountPath }, // keep path as-is on target
        logLevel: 'warn',
      }),
    );
    console.log(`[auth] REMOTE mode — proxying ${mountPath} -> ${this.targetUrl}`);
    return null; // no local authMiddleware instance available in this process
  }
}

module.exports = ProxyAuthStrategy;
