'use strict';

class AddTicketCommentUseCase {
  constructor({ ticketRepository, auditService }) {
    this.ticketRepository = ticketRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const comment = await this.ticketRepository.addComment(command.ticketId, command);
    await this.auditService.log('ticket.comment_added', {
      ticketId: command.ticketId,
      authorId: command.authorId,
    });
    return comment;
  }
}

module.exports = AddTicketCommentUseCase;
