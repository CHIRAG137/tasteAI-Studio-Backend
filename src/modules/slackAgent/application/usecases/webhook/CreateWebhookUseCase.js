'use strict';

class CreateWebhookUseCase {
  constructor({ webhookRepository, auditService }) {
    this.webhookRepository = webhookRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const webhook = await this.webhookRepository.save(command);
    await this.auditService.log('webhook.created', {
      webhookId: webhook.id,
      organizationId: command.organizationId,
    });
    return webhook;
  }
}

module.exports = CreateWebhookUseCase;
