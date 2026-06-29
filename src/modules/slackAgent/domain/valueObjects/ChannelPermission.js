'use strict';

const VALID_PERMISSIONS = ['read', 'write', 'monitor', 'admin', 'manage_agents', 'manage_tickets', 'view_analytics', 'manage_workflows'];

class ChannelPermission {
  constructor(value) {
    if (!VALID_PERMISSIONS.includes(value)) {
      throw new Error(`Invalid permission "${value}". Must be one of: ${VALID_PERMISSIONS.join(', ')}`);
    }
    this._value = value;
    Object.freeze(this);
  }

  get value() { return this._value; }

  equals(other) {
    return other instanceof ChannelPermission && this._value === other._value;
  }

  valueOf() { return this._value; }

  toString() { return this._value; }

  static READ = new ChannelPermission('read');
  static WRITE = new ChannelPermission('write');
  static MONITOR = new ChannelPermission('monitor');
  static ADMIN = new ChannelPermission('admin');
  static MANAGE_AGENTS = new ChannelPermission('manage_agents');
  static MANAGE_TICKETS = new ChannelPermission('manage_tickets');
  static VIEW_ANALYTICS = new ChannelPermission('view_analytics');
  static MANAGE_WORKFLOWS = new ChannelPermission('manage_workflows');
  static values() { return VALID_PERMISSIONS; }
}

module.exports = ChannelPermission;
