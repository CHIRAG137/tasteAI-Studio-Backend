'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createSlackAIRoutes({ slackAIController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /slack-ai/features
   * @desc    List available Slack AI features
   * @access  Private
   */
  router.get('/features', authMiddleware.requireAuth, asyncHandler(slackAIController.listFeatures));

  /**
   * @route   GET /slack-ai/agents/:agentId/capabilities
   * @desc    Get Slack AI capabilities for an agent
   * @access  Private
   */
  router.get(
    '/agents/:agentId/capabilities',
    authMiddleware.requireAuth,
    asyncHandler(slackAIController.getCapabilities),
  );

  /**
   * @route   PATCH /slack-ai/agents/:agentId/capabilities
   * @desc    Update Slack AI capabilities for an agent
   * @access  Private
   */
  router.patch(
    '/agents/:agentId/capabilities',
    authMiddleware.requireAuth,
    asyncHandler(slackAIController.updateCapabilities),
  );

  /**
   * @route   POST /slack-ai/agents/:agentId/trigger-summary
   * @desc    Manually trigger a channel summary for an agent
   * @access  Private
   */
  router.post(
    '/agents/:agentId/trigger-summary',
    authMiddleware.requireAuth,
    asyncHandler(slackAIController.triggerChannelSummary),
  );

  return router;
};
