'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createAuditRoutes({ auditController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /audit-logs
   * @desc    List audit logs
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(auditController.list));

  /**
   * @route   GET /audit-logs/resource/:resourceType/:resourceId
   * @desc    Get audit logs for a specific resource
   * @access  Private
   */
  router.get('/resource/:resourceType/:resourceId', authMiddleware.requireAuth, asyncHandler(auditController.getByResource));

  /**
   * @route   GET /audit-logs/actor/:actorId
   * @desc    Get audit logs by actor
   * @access  Private
   */
  router.get('/actor/:actorId', authMiddleware.requireAuth, asyncHandler(auditController.getByActor));

  /**
   * @route   GET /audit-logs/ai-decisions
   * @desc    Get AI decision audit logs
   * @access  Private
   */
  router.get('/ai-decisions', authMiddleware.requireAuth, asyncHandler(auditController.getAIDecisions));

  /**
   * @route   GET /audit-logs/approvals
   * @desc    Get approval history
   * @access  Private
   */
  router.get('/approvals', authMiddleware.requireAuth, asyncHandler(auditController.getApprovals));

  return router;
};
