'use strict';

const VALID_STATUSES = ['online', 'offline', 'idle', 'busy', 'disabled', 'error'];

class AgentStatus {
  constructor(value) {
    if (!VALID_STATUSES.includes(value)) {
      throw new Error(`Invalid agent status "${value}". Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    this._value = value;
    Object.freeze(this);
  }

  get value() { return this._value; }

  isActive() {
    return this._value === 'online' || this._value === 'idle';
  }

  equals(other) {
    return other instanceof AgentStatus && this._value === other._value;
  }

  valueOf() { return this._value; }

  toString() { return this._value; }

  static ONLINE = new AgentStatus('online');
  static OFFLINE = new AgentStatus('offline');
  static IDLE = new AgentStatus('idle');
  static BUSY = new AgentStatus('busy');
  static DISABLED = new AgentStatus('disabled');
  static ERROR = new AgentStatus('error');
  static values() { return VALID_STATUSES; }
}

module.exports = AgentStatus;
