'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createAgentInvocationRoutes({ agentInvocationController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /agents/:agentId/invocation
   * @desc    Get agent invocation configuration
   * @access  Private
   */
  router.get('/:agentId/invocation', authMiddleware.requireAuth, asyncHandler(agentInvocationController.getConfig));

  /**
   * @route   PATCH /agents/:agentId/invocation
   * @desc    Update agent invocation configuration
   * @access  Private
   */
  router.patch('/:agentId/invocation', authMiddleware.requireAuth, asyncHandler(agentInvocationController.updateConfig));

  /**
   * @route   GET /invocation/modes
   * @desc    List available invocation modes with descriptions
   * @access  Private
   */
  router.get('/invocation/modes', authMiddleware.requireAuth, asyncHandler(agentInvocationController.listDefaultModes));

  /**
   * @route   POST /agents/:agentId/invocation/simulate
   * @desc    Simulate an event to test agent invocation routing
   * @access  Private
   */
  router.post('/:agentId/invocation/simulate', authMiddleware.requireAuth, asyncHandler(agentInvocationController.simulateEvent));

  return router;
};
