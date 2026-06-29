'use strict';

class MergeTicketsUseCase {
  constructor({ ticketRepository, auditService }) {
    this.ticketRepository = ticketRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const result = await this.ticketRepository.merge(command.sourceTicketIds, command.targetTicketId);
    await this.auditService.log('tickets.merged', { sourceIds: command.sourceTicketIds, targetId: command.targetTicketId });
    return result;
  }
}

module.exports = MergeTicketsUseCase;
