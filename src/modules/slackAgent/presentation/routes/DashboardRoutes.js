'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createDashboardRoutes({ dashboardController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /dashboard/executive
   * @desc    Executive dashboard metrics
   * @access  Private
   */
  router.get(
    '/executive',
    authMiddleware.requireAuth,
    asyncHandler(dashboardController.getExecutive),
  );

  /**
   * @route   GET /dashboard/team
   * @desc    Team dashboard metrics
   * @access  Private
   */
  router.get('/team', authMiddleware.requireAuth, asyncHandler(dashboardController.getTeam));

  /**
   * @route   GET /dashboard/agent
   * @desc    Agent dashboard metrics
   * @access  Private
   */
  router.get('/agent', authMiddleware.requireAuth, asyncHandler(dashboardController.getAgent));

  /**
   * @route   GET /dashboard/tickets
   * @desc    Ticket dashboard metrics
   * @access  Private
   */
  router.get('/tickets', authMiddleware.requireAuth, asyncHandler(dashboardController.getTicket));

  /**
   * @route   GET /dashboard/live
   * @desc    Live monitoring dashboard
   * @access  Private
   */
  router.get(
    '/live',
    authMiddleware.requireAuth,
    asyncHandler(dashboardController.getLiveMonitoring),
  );

  return router;
};
