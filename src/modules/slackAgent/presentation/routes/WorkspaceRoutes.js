'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const { requireWorkspaceAccess } = require('../middleware/SlackAgentAuthMiddleware');

module.exports = function createWorkspaceRoutes({ workspaceController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /workspaces/oauth-url
   * @desc    Get Slack OAuth installation URL
   * @access  Private
   */
  router.get(
    '/oauth-url',
    authMiddleware.requireAuth,
    asyncHandler(workspaceController.getOAuthUrl),
  );

  /**
   * @route   POST /workspaces/install
   * @desc    Install Slack workspace (OAuth callback handler)
   * @access  Private
   */
  router.post('/install', authMiddleware.requireAuth, asyncHandler(workspaceController.install));

  /**
   * @route   GET /workspaces
   * @desc    List all installed workspaces
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(workspaceController.list));

  /**
   * @route   GET /workspaces/:workspaceId
   * @desc    Get workspace details
   * @access  Private
   */
  router.get(
    '/:workspaceId',
    authMiddleware.requireAuth,
    requireWorkspaceAccess,
    asyncHandler(workspaceController.getById),
  );

  /**
   * @route   POST /workspaces/:workspaceId/sync
   * @desc    Sync workspace information from Slack
   * @access  Private
   */
  router.post(
    '/:workspaceId/sync',
    authMiddleware.requireAuth,
    requireWorkspaceAccess,
    asyncHandler(workspaceController.sync),
  );

  /**
   * @route   PATCH /workspaces/:workspaceId/settings
   * @desc    Update workspace settings
   * @access  Private
   */
  router.patch(
    '/:workspaceId/settings',
    authMiddleware.requireAuth,
    requireWorkspaceAccess,
    asyncHandler(workspaceController.updateSettings),
  );

  /**
   * @route   DELETE /workspaces/:workspaceId
   * @desc    Disconnect/delete workspace
   * @access  Private
   */
  router.delete(
    '/:workspaceId',
    authMiddleware.requireAuth,
    requireWorkspaceAccess,
    asyncHandler(workspaceController.disconnect),
  );

  return router;
};
