'use strict';

/**
 * Interface representing an event bus.
 * @interface
 */
class IEventBus {
  publish(event) {
    throw new Error('Not Implemented');
  }

  subscribe(eventName, handler) {
    throw new Error('Not Implemented');
  }
}

module.exports = IEventBus;
