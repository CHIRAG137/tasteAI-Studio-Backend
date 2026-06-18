'use strict';

const EventEmitter = require('events');
const IEventBus = require('../../domain/services/IEventBus');
const logger = require('../../../shared/logging');

/**
 * In-process event bus backed by Node.js EventEmitter.
 *
 * Suitable for single-process deployments. For multi-instance / distributed
 * deployments, swap this with a Redis Pub/Sub or message queue adapter
 * (e.g., RedisPubSubEventBus) without changing any consumer code.
 *
 * Events are dispatched via setImmediate() so publishing never blocks
 * the current request/response cycle.
 */
class InMemoryEventBus extends IEventBus {
  constructor() {
    super();

    this._emitter = new EventEmitter();

    // Increase default limit to accommodate many event listeners across modules
    this._emitter.setMaxListeners(50);

    // Prevent unhandled EventEmitter errors from crashing the process
    this._emitter.on('error', (err) => {
      logger.error('InMemoryEventBus internal error', { message: err.message, stack: err.stack });
    });
  }

  /**
   * Publishes an event to all registered subscribers.
   * Dispatched asynchronously via setImmediate to avoid blocking the caller.
   *
   * @param {object} event - Domain event instance (e.g. UserLoggedInEvent)
   */
  publish(event) {
    setImmediate(() => {
      try {
        this._emitter.emit(event.constructor.name, event);
      } catch (err) {
        logger.error('InMemoryEventBus publish error', {
          event: event.constructor.name,
          message: err.message,
        });
      }
    });
  }

  /**
   * Subscribes a handler to a named event.
   * @param {string} eventName - e.g. 'UserLoggedInEvent'
   * @param {Function} handler
   */
  subscribe(eventName, handler) {
    this._emitter.on(eventName, handler);
  }

  /**
   * Removes a previously registered event handler.
   * @param {string} eventName
   * @param {Function} handler
   */
  unsubscribe(eventName, handler) {
    this._emitter.off(eventName, handler);
  }
}

module.exports = InMemoryEventBus;
