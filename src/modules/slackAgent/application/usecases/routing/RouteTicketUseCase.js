'use strict';

class RouteTicketUseCase {
  constructor({ routingService, ticketRepository, auditService }) {
    this.routingService = routingService;
    this.ticketRepository = ticketRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const assignment = await this.routingService.route(command.ticketId);
    await this.ticketRepository.update(command.ticketId, { assignedToId: assignment.assignedToId });
    await this.auditService.log('ticket.routed', {
      ticketId: command.ticketId,
      assignedToId: assignment.assignedToId,
    });
    return assignment;
  }
}

module.exports = RouteTicketUseCase;
