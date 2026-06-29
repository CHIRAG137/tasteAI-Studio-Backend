'use strict';

class IEventBus {
  async publish(eventType, payload) { throw new Error('Not implemented'); }
  async subscribe(eventType, handler) { throw new Error('Not implemented'); }
  async unsubscribe(eventType, handler) { throw new Error('Not implemented'); }
  async publishDelayed(eventType, payload, delayMs) { throw new Error('Not implemented'); }
}

module.exports = IEventBus;
