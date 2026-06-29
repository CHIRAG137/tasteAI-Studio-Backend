'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createWebhookRoutes({ webhookController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /webhooks
   * @desc    Create a webhook (incoming or outgoing)
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(webhookController.create));

  /**
   * @route   GET /webhooks
   * @desc    List webhooks
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(webhookController.list));

  /**
   * @route   GET /webhooks/:webhookId
   * @desc    Get webhook details
   * @access  Private
   */
  router.get('/:webhookId', authMiddleware.requireAuth, asyncHandler(webhookController.getById));

  /**
   * @route   PATCH /webhooks/:webhookId
   * @desc    Update webhook configuration
   * @access  Private
   */
  router.patch('/:webhookId', authMiddleware.requireAuth, asyncHandler(webhookController.update));

  /**
   * @route   DELETE /webhooks/:webhookId
   * @desc    Delete webhook
   * @access  Private
   */
  router.delete('/:webhookId', authMiddleware.requireAuth, asyncHandler(webhookController.delete));

  /**
   * @route   POST /webhooks/:webhookId/trigger
   * @desc    Trigger an outgoing webhook
   * @access  Private
   */
  router.post(
    '/:webhookId/trigger',
    authMiddleware.requireAuth,
    asyncHandler(webhookController.trigger),
  );

  /**
   * @route   POST /webhooks/:webhookId/retry
   * @desc    Retry a failed webhook delivery from dead-letter queue
   * @access  Private
   */
  router.post(
    '/:webhookId/retry',
    authMiddleware.requireAuth,
    asyncHandler(webhookController.retry),
  );

  /**
   * @route   GET /webhooks/:webhookId/dead-letter
   * @desc    Get dead-letter queue entries for webhook
   * @access  Private
   */
  router.get(
    '/:webhookId/dead-letter',
    authMiddleware.requireAuth,
    asyncHandler(webhookController.getDeadLetter),
  );

  return router;
};
