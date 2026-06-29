'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createRoutingRoutes({ routingController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /routing/rules
   * @desc    Create routing rule
   * @access  Private
   */
  router.post('/rules', authMiddleware.requireAuth, asyncHandler(routingController.createRule));

  /**
   * @route   GET /routing/rules
   * @desc    List routing rules
   * @access  Private
   */
  router.get('/rules', authMiddleware.requireAuth, asyncHandler(routingController.listRules));

  /**
   * @route   PATCH /routing/rules/:ruleId
   * @desc    Update routing rule
   * @access  Private
   */
  router.patch('/rules/:ruleId', authMiddleware.requireAuth, asyncHandler(routingController.updateRule));

  /**
   * @route   DELETE /routing/rules/:ruleId
   * @desc    Delete routing rule
   * @access  Private
   */
  router.delete('/rules/:ruleId', authMiddleware.requireAuth, asyncHandler(routingController.deleteRule));

  /**
   * @route   POST /routing/route-ticket
   * @desc    Route a ticket based on rules
   * @access  Private
   */
  router.post('/route-ticket', authMiddleware.requireAuth, asyncHandler(routingController.routeTicket));

  return router;
};
