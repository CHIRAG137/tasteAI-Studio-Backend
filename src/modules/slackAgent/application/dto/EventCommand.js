'use strict';

class ProcessEventCommand {
  constructor({ eventId, organizationId }) {
    this.eventId = eventId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.eventId) {
      throw new Error('Event id is required');
    }
  }
}

class IngestEventCommand {
  constructor({ rawBody, source, organizationId }) {
    this.rawBody = rawBody;
    this.source = source;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.rawBody) {
      throw new Error('Raw event body is required');
    }
  }
}

module.exports = { ProcessEventCommand, IngestEventCommand };
