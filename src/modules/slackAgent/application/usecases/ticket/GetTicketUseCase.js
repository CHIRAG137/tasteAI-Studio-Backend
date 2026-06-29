'use strict';

class GetTicketUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(ticketId) {
    return this.ticketRepository.findById(ticketId);
  }
}

module.exports = GetTicketUseCase;
