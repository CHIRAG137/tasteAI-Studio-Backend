'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createUserRoutes({ userController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /workspaces/:workspaceId/users/sync
   * @desc    Sync users from Slack
   * @access  Private
   */
  router.post(
    '/workspaces/:workspaceId/users/sync',
    authMiddleware.requireAuth,
    asyncHandler(userController.sync),
  );

  /**
   * @route   GET /workspaces/:workspaceId/users
   * @desc    List all users in a workspace
   * @access  Private
   */
  router.get(
    '/workspaces/:workspaceId/users',
    authMiddleware.requireAuth,
    asyncHandler(userController.list),
  );

  /**
   * @route   GET /workspaces/:workspaceId/users/:slackUserId
   * @desc    Lookup a specific Slack user
   * @access  Private
   */
  router.get(
    '/workspaces/:workspaceId/users/:slackUserId',
    authMiddleware.requireAuth,
    asyncHandler(userController.lookup),
  );

  /**
   * @route   GET /workspaces/:workspaceId/user-groups
   * @desc    List user groups in workspace
   * @access  Private
   */
  router.get(
    '/workspaces/:workspaceId/user-groups',
    authMiddleware.requireAuth,
    asyncHandler(userController.getUserGroups),
  );

  /**
   * @route   GET /workspaces/:workspaceId/teams
   * @desc    List teams in workspace
   * @access  Private
   */
  router.get(
    '/workspaces/:workspaceId/teams',
    authMiddleware.requireAuth,
    asyncHandler(userController.getTeams),
  );

  return router;
};
