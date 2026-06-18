'use strict';

const { createAuthModule } = require('../modules/auth');

/**
 * Dependency container — a simple service locator that wires up all modules.
 *
 * The container is lazily initialised on first access to avoid blocking
 * the module import graph before app.listen() is called. Subsequent calls
 * return the same cached instance (singleton per process).
 *
 * @example
 * const { authModule } = getContainer();
 * app.use('/auth', authModule.router);
 */

let _container = null;

function getContainer() {
  if (!_container) {
    _container = Object.freeze({
      authModule: createAuthModule(),
    });
  }
  return _container;
}

module.exports = { getContainer };
