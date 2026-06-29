'use strict';

class CreateTicketUseCase {
  constructor({
    ticketRepository,
    classificationService,
    routingService,
    slaService,
    auditService,
  }) {
    this.ticketRepository = ticketRepository;
    this.classificationService = classificationService;
    this.routingService = routingService;
    this.slaService = slaService;
    this.auditService = auditService;
  }

  async execute(command) {
    const ticket = await this.ticketRepository.save(command);
    await this.classificationService.classify(ticket.id);
    await this.routingService.route(ticket.id);
    await this.slaService.startTimer(ticket.id);
    await this.auditService.log('ticket.created', { ticketId: ticket.id });
    return ticket;
  }
}

module.exports = CreateTicketUseCase;
