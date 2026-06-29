'use strict';

class ClassifyTicketUseCase {
  constructor({ classificationService, ticketRepository, auditService }) {
    this.classificationService = classificationService;
    this.ticketRepository = ticketRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const result = await this.classificationService.classify(command.ticketId);
    await this.ticketRepository.update(command.ticketId, {
      category: result.category,
      priority: result.priority,
      tags: result.tags,
    });
    await this.auditService.log('ticket.classified', {
      ticketId: command.ticketId,
      category: result.category,
      priority: result.priority,
    });
    return result;
  }
}

module.exports = ClassifyTicketUseCase;
