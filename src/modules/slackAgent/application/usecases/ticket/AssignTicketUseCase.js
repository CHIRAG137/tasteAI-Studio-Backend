'use strict';

class AssignTicketUseCase {
  constructor({ ticketRepository, notificationService, auditService }) {
    this.ticketRepository = ticketRepository;
    this.notificationService = notificationService;
    this.auditService = auditService;
  }

  async execute(command) {
    const ticket = await this.ticketRepository.update(command.ticketId, {
      assignedToId: command.assigneeId,
      status: 'in_progress',
    });
    await this.notificationService.notifyAssignee(ticket.id, command.assigneeId);
    await this.auditService.log('ticket.assigned', {
      ticketId: command.ticketId,
      assigneeId: command.assigneeId,
    });
    return ticket;
  }
}

module.exports = AssignTicketUseCase;
