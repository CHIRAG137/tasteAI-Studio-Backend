'use strict';

class UpdateTicketUseCase {
  constructor({ ticketRepository, auditService }) {
    this.ticketRepository = ticketRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const ticket = await this.ticketRepository.update(command.ticketId, command);
    await this.auditService.log('ticket.updated', { ticketId: command.ticketId, changes: command });
    return ticket;
  }
}

module.exports = UpdateTicketUseCase;
