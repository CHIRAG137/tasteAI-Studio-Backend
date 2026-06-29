'use strict';

class Event {
  constructor({
    id,
    organizationId,
    workspaceId,
    channelId,
    teamId,
    eventId,
    eventType,
    eventTs,
    source,
    rawBody,
    processedBy,
    status,
    error,
    retryCount,
    processedAt,
    createdAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.workspaceId = workspaceId;
    this.channelId = channelId;
    this.teamId = teamId;
    this.eventId = eventId;
    this.eventType = eventType;
    this.eventTs = eventTs;
    this.source = source;
    this.rawBody = rawBody;
    this.processedBy = processedBy;
    this.status = status || 'pending';
    this.error = error;
    this.retryCount = retryCount || 0;
    this.processedAt = processedAt;
    this.createdAt = createdAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.eventId) {
      throw new Error('Event id is required');
    }
    if (!this.eventType) {
      throw new Error('Event type is required');
    }
  }
}

module.exports = Event;
