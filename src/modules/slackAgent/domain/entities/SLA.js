'use strict';

class SLA {
  constructor({ id, organizationId, name, description, priority, responseTimeMinutes, resolutionTimeMinutes, businessHoursOnly, businessHoursId, escalateAfterBreach, escalationRuleId, notifyOnBreach, notificationConfig, reminderConfig, isActive, conditions, metadata, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.responseTimeMinutes = responseTimeMinutes;
    this.resolutionTimeMinutes = resolutionTimeMinutes;
    this.businessHoursOnly = businessHoursOnly || false;
    this.businessHoursId = businessHoursId;
    this.escalateAfterBreach = escalateAfterBreach || false;
    this.escalationRuleId = escalationRuleId;
    this.notifyOnBreach = notifyOnBreach || false;
    this.notificationConfig = notificationConfig || {};
    this.reminderConfig = reminderConfig || {};
    this.isActive = isActive !== undefined ? isActive : true;
    this.conditions = conditions || {};
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('SLA name is required');
    if (!this.responseTimeMinutes) throw new Error('Response time is required');
    if (!this.resolutionTimeMinutes) throw new Error('Resolution time is required');
  }
}

module.exports = SLA;
