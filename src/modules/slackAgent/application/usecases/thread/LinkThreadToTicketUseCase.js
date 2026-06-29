'use strict';

class LinkThreadToTicketUseCase {
  constructor({ threadRepository, ticketRepository }) {
    this.threadRepository = threadRepository;
    this.ticketRepository = ticketRepository;
  }

  async execute(command) {
    await this.threadRepository.update(command.threadId, { linkedTicketId: command.ticketId, isMonitored: true });
    await this.ticketRepository.update(command.ticketId, { threadId: command.threadId });
    return { threadId: command.threadId, ticketId: command.ticketId };
  }
}

module.exports = LinkThreadToTicketUseCase;
