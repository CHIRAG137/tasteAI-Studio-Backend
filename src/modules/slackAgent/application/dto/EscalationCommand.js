'use strict';

class CreateEscalationCommand {
  constructor({ organizationId, name, description, trigger, conditions, levels, notifyOnEscalate, notificationConfig, autoResolve }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.trigger = trigger;
    this.conditions = conditions;
    this.levels = levels;
    this.notifyOnEscalate = notifyOnEscalate;
    this.notificationConfig = notificationConfig;
    this.autoResolve = autoResolve;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Escalation name is required');
    if (!this.trigger) throw new Error('Escalation trigger is required');
  }
}

class TriggerEscalationCommand {
  constructor({ escalationId, ticketId, organizationId }) {
    this.escalationId = escalationId;
    this.ticketId = ticketId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.escalationId) throw new Error('Escalation id is required');
    if (!this.ticketId) throw new Error('Ticket id is required');
  }
}

module.exports = { CreateEscalationCommand, TriggerEscalationCommand };
