'use strict';

class ListWebhooksUseCase {
  constructor({ webhookRepository }) {
    this.webhookRepository = webhookRepository;
  }

  async execute(command) {
    const { organizationId } = command;
    return this.webhookRepository.findByOrganizationId(organizationId);
  }
}

module.exports = ListWebhooksUseCase;
