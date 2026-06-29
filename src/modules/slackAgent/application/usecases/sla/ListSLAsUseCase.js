'use strict';

class ListSLAsUseCase {
  constructor({ slaRepository }) {
    this.slaRepository = slaRepository;
  }

  async execute(organizationId) {
    return this.slaRepository.findByOrganizationId(organizationId);
  }
}

module.exports = ListSLAsUseCase;
