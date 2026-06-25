'use strict';

const EventEmitter = require('events');
const logger = require('../../../shared/logging');

class InMemoryEventBus {
  constructor() {
    this._emitter = new EventEmitter();
    this._emitter.setMaxListeners(50);
    this._emitter.on('error', (err) => {
      logger.error('InMemoryEventBus internal error', { message: err.message, stack: err.stack });
    });
  }

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

  subscribe(eventName, handler) {
    this._emitter.on(eventName, handler);
  }

  unsubscribe(eventName, handler) {
    this._emitter.off(eventName, handler);
  }
}

module.exports = InMemoryEventBus;
