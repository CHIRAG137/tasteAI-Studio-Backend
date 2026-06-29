'use strict';

class TriggerWebhookUseCase {
  constructor({ webhookRepository, webhookService, auditService }) {
    this.webhookRepository = webhookRepository;
    this.webhookService = webhookService;
    this.auditService = auditService;
  }

  async execute(webhookId) {
    const webhook = await this.webhookRepository.findById(webhookId);
    const result = await this.webhookService.trigger(webhook);
    await this.auditService.log('webhook.triggered', { webhookId });
    return result;
  }
}

module.exports = TriggerWebhookUseCase;
