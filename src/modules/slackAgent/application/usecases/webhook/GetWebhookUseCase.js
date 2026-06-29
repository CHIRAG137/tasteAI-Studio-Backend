'use strict';

class GetWebhookUseCase {
  constructor({ webhookRepository }) {
    this.webhookRepository = webhookRepository;
  }

  async execute(command) {
    const { webhookId, organizationId } = command;
    const webhook = await this.webhookRepository.findById(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    if (webhook.organizationId.toString() !== organizationId) {
      throw new Error('Access denied');
    }
    return webhook;
  }
}

module.exports = GetWebhookUseCase;
