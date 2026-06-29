'use strict';

class SLATimer {
  constructor({ slaPolicyId, ticketId, responseDeadline, resolutionDeadline, responseReminderSent, resolutionReminderSent, responseBreached, resolutionBreached, pausedAt, pausedDuration, businessHoursId, startedAt, createdAt }) {
    this.slaPolicyId = slaPolicyId;
    this.ticketId = ticketId;
    this.responseDeadline = responseDeadline;
    this.resolutionDeadline = resolutionDeadline;
    this.responseReminderSent = responseReminderSent || false;
    this.resolutionReminderSent = resolutionReminderSent || false;
    this.responseBreached = responseBreached || false;
    this.resolutionBreached = resolutionBreached || false;
    this.pausedAt = pausedAt;
    this.pausedDuration = pausedDuration || 0;
    this.businessHoursId = businessHoursId;
    this.startedAt = startedAt || new Date();
    this.createdAt = createdAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.slaPolicyId) throw new Error('SLA policy id is required');
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.responseDeadline) throw new Error('Response deadline is required');
    if (!this.resolutionDeadline) throw new Error('Resolution deadline is required');
  }

  isResponseOvertime() {
    return new Date() > this.responseDeadline;
  }

  isResolutionOvertime() {
    return new Date() > this.resolutionDeadline;
  }
}

module.exports = SLATimer;
