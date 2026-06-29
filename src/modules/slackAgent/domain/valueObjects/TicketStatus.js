'use strict';

const VALID_STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'waiting_on_third_party', 'resolved', 'closed', 'reopened', 'merged', 'spam', 'archived'];

class TicketStatus {
  constructor(value) {
    if (!VALID_STATUSES.includes(value)) {
      throw new Error(`Invalid status "${value}". Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    this._value = value;
    Object.freeze(this);
  }

  get value() { return this._value; }

  equals(other) {
    return other instanceof TicketStatus && this._value === other._value;
  }

  isActive() {
    return ['open', 'in_progress', 'waiting_on_customer', 'waiting_on_third_party', 'reopened'].includes(this._value);
  }

  isResolved() {
    return this._value === 'resolved';
  }

  isClosed() {
    return this._value === 'closed';
  }

  valueOf() { return this._value; }

  toString() { return this._value; }

  static OPEN = new TicketStatus('open');
  static IN_PROGRESS = new TicketStatus('in_progress');
  static WAITING_ON_CUSTOMER = new TicketStatus('waiting_on_customer');
  static WAITING_ON_THIRD_PARTY = new TicketStatus('waiting_on_third_party');
  static RESOLVED = new TicketStatus('resolved');
  static CLOSED = new TicketStatus('closed');
  static REOPENED = new TicketStatus('reopened');
  static MERGED = new TicketStatus('merged');
  static SPAM = new TicketStatus('spam');
  static ARCHIVED = new TicketStatus('archived');
  static values() { return VALID_STATUSES; }
}

module.exports = TicketStatus;
