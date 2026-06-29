'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createThreadRoutes({ threadController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /tickets/:ticketId/thread
   * @desc    Get thread linked to ticket
   * @access  Private
   */
  router.get('/tickets/:ticketId/thread', authMiddleware.requireAuth, asyncHandler(threadController.getByTicket));

  /**
   * @route   POST /threads/:threadId/link
   * @desc    Link thread to ticket
   * @access  Private
   */
  router.post('/threads/:threadId/link', authMiddleware.requireAuth, asyncHandler(threadController.linkToTicket));

  /**
   * @route   GET /threads/:threadId
   * @desc    Fetch thread messages from Slack
   * @access  Private
   */
  router.get('/threads/:threadId', authMiddleware.requireAuth, asyncHandler(threadController.fetch));

  /**
   * @route   POST /threads/:threadId/sync
   * @desc    Sync thread from Slack
   * @access  Private
   */
  router.post('/threads/:threadId/sync', authMiddleware.requireAuth, asyncHandler(threadController.sync));

  /**
   * @route   POST /threads/:threadId/summary
   * @desc    Generate AI summary of thread
   * @access  Private
   */
  router.post('/threads/:threadId/summary', authMiddleware.requireAuth, asyncHandler(threadController.summary));

  return router;
};
