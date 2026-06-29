'use strict';

const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];

class Priority {
  constructor(value) {
    if (!VALID_PRIORITIES.includes(value)) {
      throw new Error(`Invalid priority "${value}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }
    this._value = value;
    Object.freeze(this);
  }

  get value() { return this._value; }

  equals(other) {
    return other instanceof Priority && this._value === other._value;
  }

  valueOf() { return this._value; }

  toString() { return this._value; }

  static CRITICAL = new Priority('critical');
  static HIGH = new Priority('high');
  static MEDIUM = new Priority('medium');
  static LOW = new Priority('low');
  static values() { return VALID_PRIORITIES; }
}

module.exports = Priority;
