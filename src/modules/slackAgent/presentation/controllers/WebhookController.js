'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class WebhookController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  create = async (req, res) => {
    const webhook = await this.slackAgentFacade.createWebhookUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      createdById: req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, webhook, 'Webhook created');
  };

  list = async (req, res) => {
    const organizationId = req.user.organizationId || req.user.id;
    const webhooks = await this.slackAgentFacade.listWebhooksUseCase.execute({ organizationId });
    return ApiResponse.success(res, webhooks);
  };

  getById = async (req, res) => {
    const webhook = await this.slackAgentFacade.getWebhookUseCase.execute({
      webhookId: req.params.webhookId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, webhook);
  };

  update = async (req, res) => {
    const webhook = await this.slackAgentFacade.updateWebhookUseCase.execute({
      webhookId: req.params.webhookId,
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.success(res, webhook, 'Webhook updated');
  };

  delete = async (req, res) => {
    await this.slackAgentFacade.deleteWebhookUseCase.execute({
      webhookId: req.params.webhookId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, null, 'Webhook deleted');
  };

  trigger = async (req, res) => {
    const result = await this.slackAgentFacade.triggerWebhookUseCase.execute({
      webhookId: req.params.webhookId,
      payload: req.body,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.accepted(res, result, 'Webhook triggered');
  };

  retry = async (req, res) => {
    const result = await this.slackAgentFacade.retryWebhookUseCase.execute({
      webhookId: req.params.webhookId,
      deadLetterEntryId: req.body.entryId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.accepted(res, result, 'Retry queued');
  };

  getDeadLetter = async (req, res) => {
    return ApiResponse.success(res, []);
  };
}

module.exports = WebhookController;
