'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createNotificationRoutes({ notificationController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /notifications/send
   * @desc    Send a notification (Slack, Email, Webhook)
   * @access  Private
   */
  router.post('/send', authMiddleware.requireAuth, asyncHandler(notificationController.send));

  /**
   * @route   GET /notifications
   * @desc    List notifications
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(notificationController.list));

  /**
   * @route   POST /notifications/:notificationId/read
   * @desc    Mark notification as read
   * @access  Private
   */
  router.post(
    '/:notificationId/read',
    authMiddleware.requireAuth,
    asyncHandler(notificationController.markRead),
  );

  return router;
};
