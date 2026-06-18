'use strict';

/**
 * Abstract base class for all application-layer use cases (commands & queries).
 *
 * Enforces the execute() contract so the entire application layer is consistent.
 * All use cases should extend this class.
 *
 * @abstract
 * @example
 * class MyUseCase extends BaseUseCase {
 *   async execute(command) {
 *     // ...
 *   }
 * }
 */
class BaseUseCase {
  /**
   * Execute the use case with the given input.
   * @param {*} input - Command or query object
   * @returns {Promise<*>}
   * @abstract
   */

  async execute(input) {
    throw new Error(`${this.constructor.name} must implement execute()`);
  }
}

module.exports = BaseUseCase;
