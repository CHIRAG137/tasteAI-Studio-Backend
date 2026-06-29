'use strict';

class CreateSLACommand {
  constructor({ organizationId, name, description, priority, responseTimeMinutes, resolutionTimeMinutes, businessHoursOnly, businessHoursId, escalateAfterBreach, escalationRuleId, notifyOnBreach, notificationConfig, reminderConfig, conditions }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.responseTimeMinutes = responseTimeMinutes;
    this.resolutionTimeMinutes = resolutionTimeMinutes;
    this.businessHoursOnly = businessHoursOnly;
    this.businessHoursId = businessHoursId;
    this.escalateAfterBreach = escalateAfterBreach;
    this.escalationRuleId = escalationRuleId;
    this.notifyOnBreach = notifyOnBreach;
    this.notificationConfig = notificationConfig;
    this.reminderConfig = reminderConfig;
    this.conditions = conditions;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('SLA name is required');
    if (!this.responseTimeMinutes) throw new Error('Response time is required');
    if (!this.resolutionTimeMinutes) throw new Error('Resolution time is required');
  }
}

class StartSLATimerCommand {
  constructor({ slaPolicyId, ticketId, organizationId }) {
    this.slaPolicyId = slaPolicyId;
    this.ticketId = ticketId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.slaPolicyId) throw new Error('SLA policy id is required');
    if (!this.ticketId) throw new Error('Ticket id is required');
  }
}

module.exports = { CreateSLACommand, StartSLATimerCommand };
