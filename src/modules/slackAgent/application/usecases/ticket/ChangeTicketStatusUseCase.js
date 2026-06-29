'use strict';

class ChangeTicketStatusUseCase {
  constructor({ ticketRepository, slaService, auditService }) {
    this.ticketRepository = ticketRepository;
    this.slaService = slaService;
    this.auditService = auditService;
  }

  async execute(command) {
    const update = { status: command.status };
    if (command.status === 'resolved') {
      update.resolvedAt = new Date();
    }
    if (command.status === 'closed') {
      update.closedAt = new Date();
    }
    if (command.status === 'reopened') {
      update.reopenedAt = new Date();
    }
    const ticket = await this.ticketRepository.update(command.ticketId, update);
    await this.auditService.log('ticket.status_changed', {
      ticketId: command.ticketId,
      status: command.status,
    });
    return ticket;
  }
}

module.exports = ChangeTicketStatusUseCase;
