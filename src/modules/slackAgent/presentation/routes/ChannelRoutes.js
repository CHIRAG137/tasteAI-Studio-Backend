'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createChannelRoutes({ channelController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /workspaces/:workspaceId/channels
   * @desc    List all channels in a workspace
   * @access  Private
   */
  router.get(
    '/workspaces/:workspaceId/channels',
    authMiddleware.requireAuth,
    asyncHandler(channelController.list),
  );

  /**
   * @route   POST /workspaces/:workspaceId/channels/sync
   * @desc    Sync channels from Slack
   * @access  Private
   */
  router.post(
    '/workspaces/:workspaceId/channels/sync',
    authMiddleware.requireAuth,
    asyncHandler(channelController.sync),
  );

  /**
   * @route   GET /workspaces/:workspaceId/channels/search
   * @desc    Search channels by name
   * @access  Private
   */
  router.get(
    '/workspaces/:workspaceId/channels/search',
    authMiddleware.requireAuth,
    asyncHandler(channelController.search),
  );

  /**
   * @route   GET /channels/:channelId
   * @desc    Get channel details
   * @access  Private
   */
  router.get(
    '/channels/:channelId',
    authMiddleware.requireAuth,
    asyncHandler(channelController.getById),
  );

  /**
   * @route   POST /channels/:channelId/monitor
   * @desc    Add channel to monitoring list
   * @access  Private
   */
  router.post(
    '/channels/:channelId/monitor',
    authMiddleware.requireAuth,
    asyncHandler(channelController.addMonitored),
  );

  /**
   * @route   DELETE /channels/:channelId/monitor
   * @desc    Remove channel from monitoring list
   * @access  Private
   */
  router.delete(
    '/channels/:channelId/monitor',
    authMiddleware.requireAuth,
    asyncHandler(channelController.removeMonitored),
  );

  /**
   * @route   PATCH /channels/:channelId/permissions
   * @desc    Update channel permissions
   * @access  Private
   */
  router.patch(
    '/channels/:channelId/permissions',
    authMiddleware.requireAuth,
    asyncHandler(channelController.updatePermissions),
  );

  /**
   * @route   PATCH /channels/:channelId/config
   * @desc    Update channel configuration
   * @access  Private
   */
  router.patch(
    '/channels/:channelId/config',
    authMiddleware.requireAuth,
    asyncHandler(channelController.updateConfig),
  );

  return router;
};
