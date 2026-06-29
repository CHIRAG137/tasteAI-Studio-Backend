'use strict';

class UpdateWebhookUseCase {
  constructor({ webhookRepository, auditService }) {
    this.webhookRepository = webhookRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { webhookId, organizationId, ...data } = command;
    const webhook = await this.webhookRepository.findById(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    if (webhook.organizationId.toString() !== organizationId) {
      throw new Error('Access denied');
    }

    const updated = await this.webhookRepository.update(webhookId, data);
    await this.auditService.log('webhook.updated', { webhookId, organizationId });
    return updated;
  }
}

module.exports = UpdateWebhookUseCase;
