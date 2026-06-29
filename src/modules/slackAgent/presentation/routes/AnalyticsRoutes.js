'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createAnalyticsRoutes({ analyticsController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /analytics/tickets
   * @desc    Get ticket analytics (volume, trends, distribution)
   * @access  Private
   */
  router.get('/tickets', authMiddleware.requireAuth, asyncHandler(analyticsController.getTicketAnalytics));

  /**
   * @route   GET /analytics/sla
   * @desc    Get SLA compliance metrics
   * @access  Private
   */
  router.get('/sla', authMiddleware.requireAuth, asyncHandler(analyticsController.getSLAMetrics));

  /**
   * @route   GET /analytics/resolutions
   * @desc    Get resolution metrics (MTTR, FRT)
   * @access  Private
   */
  router.get('/resolutions', authMiddleware.requireAuth, asyncHandler(analyticsController.getResolutionMetrics));

  /**
   * @route   GET /analytics/categories
   * @desc    Get category distribution analytics
   * @access  Private
   */
  router.get('/categories', authMiddleware.requireAuth, asyncHandler(analyticsController.getCategoryAnalytics));

  /**
   * @route   GET /analytics/agents
   * @desc    Get agent performance analytics
   * @access  Private
   */
  router.get('/agents', authMiddleware.requireAuth, asyncHandler(analyticsController.getAgentAnalytics));

  /**
   * @route   GET /analytics/users
   * @desc    Get user/requestor analytics
   * @access  Private
   */
  router.get('/users', authMiddleware.requireAuth, asyncHandler(analyticsController.getUserAnalytics));

  /**
   * @route   GET /analytics/costs
   * @desc    Get cost analytics (LLM tokens, API calls)
   * @access  Private
   */
  router.get('/costs', authMiddleware.requireAuth, asyncHandler(analyticsController.getCostAnalytics));

  /**
   * @route   GET /analytics/latency
   * @desc    Get system latency analytics
   * @access  Private
   */
  router.get('/latency', authMiddleware.requireAuth, asyncHandler(analyticsController.getLatencyAnalytics));

  return router;
};
