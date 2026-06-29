'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createEscalationRoutes({ escalationController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /escalations
   * @desc    Create escalation rule
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(escalationController.create));

  /**
   * @route   GET /escalations
   * @desc    List escalation rules
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(escalationController.list));

  /**
   * @route   GET /escalations/:escalationId
   * @desc    Get escalation rule details
   * @access  Private
   */
  router.get('/:escalationId', authMiddleware.requireAuth, asyncHandler(escalationController.getById));

  /**
   * @route   POST /escalations/:escalationId/trigger
   * @desc    Trigger escalation for a ticket
   * @access  Private
   */
  router.post('/:escalationId/trigger', authMiddleware.requireAuth, asyncHandler(escalationController.trigger));

  return router;
};
