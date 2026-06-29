'use strict';

class Escalation {
  constructor({ id, organizationId, name, description, trigger, conditions, levels, notifyOnEscalate, notificationConfig, autoResolve, isActive, metadata, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.trigger = trigger;
    this.conditions = conditions || {};
    this.levels = levels || [];
    this.notifyOnEscalate = notifyOnEscalate || false;
    this.notificationConfig = notificationConfig || {};
    this.autoResolve = autoResolve || false;
    this.isActive = isActive !== undefined ? isActive : true;
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Escalation name is required');
    if (!this.trigger) throw new Error('Escalation trigger is required');
  }
}

module.exports = Escalation;
