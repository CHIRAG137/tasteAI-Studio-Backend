'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createWorkflowRoutes({ workflowController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /workflows
   * @desc    Create a new workflow
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(workflowController.create));

  /**
   * @route   GET /workflows
   * @desc    List workflows
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(workflowController.list));

  /**
   * @route   GET /workflows/templates
   * @desc    List workflow templates
   * @access  Private
   */
  router.get(
    '/templates',
    authMiddleware.requireAuth,
    asyncHandler(workflowController.getTemplates),
  );

  /**
   * @route   GET /workflows/:workflowId
   * @desc    Get workflow details
   * @access  Private
   */
  router.get('/:workflowId', authMiddleware.requireAuth, asyncHandler(workflowController.getById));

  /**
   * @route   PATCH /workflows/:workflowId
   * @desc    Update workflow
   * @access  Private
   */
  router.patch('/:workflowId', authMiddleware.requireAuth, asyncHandler(workflowController.update));

  /**
   * @route   DELETE /workflows/:workflowId
   * @desc    Delete workflow
   * @access  Private
   */
  router.delete(
    '/:workflowId',
    authMiddleware.requireAuth,
    asyncHandler(workflowController.delete),
  );

  /**
   * @route   POST /workflows/:workflowId/execute
   * @desc    Execute a workflow
   * @access  Private
   */
  router.post(
    '/:workflowId/execute',
    authMiddleware.requireAuth,
    asyncHandler(workflowController.execute),
  );

  /**
   * @route   GET /workflows/:workflowId/history
   * @desc    Get workflow execution history
   * @access  Private
   */
  router.get(
    '/:workflowId/history',
    authMiddleware.requireAuth,
    asyncHandler(workflowController.getHistory),
  );

  /**
   * @route   GET /workflows/executions/:executionId/logs
   * @desc    Get workflow execution logs
   * @access  Private
   */
  router.get(
    '/executions/:executionId/logs',
    authMiddleware.requireAuth,
    asyncHandler(workflowController.getLogs),
  );

  /**
   * @route   POST /workflows/executions/approve
   * @desc    Approve a human-in-the-loop workflow step
   * @access  Private
   */
  router.post(
    '/executions/approve',
    authMiddleware.requireAuth,
    asyncHandler(workflowController.approveStep),
  );

  return router;
};
