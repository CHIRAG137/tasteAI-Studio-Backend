'use strict';

class ProcessEventUseCase {
  constructor({ eventService, auditService }) {
    this.eventService = eventService;
    this.auditService = auditService;
  }

  async execute(event) {
    const result = await this.eventService.processEvent(event);
    await this.auditService.log('event.processed', { eventType: event.type, eventId: event.id });
    return result;
  }
}

module.exports = ProcessEventUseCase;
