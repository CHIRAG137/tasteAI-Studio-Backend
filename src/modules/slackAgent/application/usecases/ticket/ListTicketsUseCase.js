'use strict';

class ListTicketsUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(organizationId, filters) {
    return this.ticketRepository.findByOrganizationId(organizationId, filters);
  }
}

module.exports = ListTicketsUseCase;
