'use strict';

class DeleteWebhookUseCase {
  constructor({ webhookRepository, auditService }) {
    this.webhookRepository = webhookRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    const { webhookId, organizationId } = command;
    const webhook = await this.webhookRepository.findById(webhookId);
    if (!webhook) throw new Error('Webhook not found');
    if (webhook.organizationId.toString() !== organizationId) throw new Error('Access denied');

    await this.webhookRepository.delete(webhookId);
    await this.auditService.log('webhook.deleted', { webhookId, organizationId });
    return { deleted: true };
  }
}

module.exports = DeleteWebhookUseCase;
