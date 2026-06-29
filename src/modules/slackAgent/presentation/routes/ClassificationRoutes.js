'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createClassificationRoutes({ classificationController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /classify/tickets/:ticketId
   * @desc    AI classification of ticket (intent, category, priority, sentiment)
   * @access  Private
   */
  router.post(
    '/tickets/:ticketId',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.classify),
  );

  /**
   * @route   POST /classify/intent
   * @desc    Detect intent from text
   * @access  Private
   */
  router.post(
    '/intent',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.detectIntent),
  );

  /**
   * @route   POST /classify/category
   * @desc    Predict category from text
   * @access  Private
   */
  router.post(
    '/category',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.predictCategory),
  );

  /**
   * @route   POST /classify/priority
   * @desc    Predict priority from text
   * @access  Private
   */
  router.post(
    '/priority',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.predictPriority),
  );

  /**
   * @route   POST /classify/sentiment
   * @desc    Analyze sentiment from text
   * @access  Private
   */
  router.post(
    '/sentiment',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.analyzeSentiment),
  );

  /**
   * @route   POST /classify/duplicate
   * @desc    Detect if ticket is duplicate
   * @access  Private
   */
  router.post(
    '/duplicate',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.detectDuplicate),
  );

  /**
   * @route   GET /classify/tickets/:ticketId/similar
   * @desc    Find similar tickets
   * @access  Private
   */
  router.get(
    '/tickets/:ticketId/similar',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.findSimilar),
  );

  /**
   * @route   POST /classify/suggest-assignee
   * @desc    Suggest best assignee for ticket
   * @access  Private
   */
  router.post(
    '/suggest-assignee',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.suggestAssignee),
  );

  /**
   * @route   POST /classify/suggest-response
   * @desc    Suggest AI response for ticket
   * @access  Private
   */
  router.post(
    '/suggest-response',
    authMiddleware.requireAuth,
    asyncHandler(classificationController.suggestResponse),
  );

  return router;
};
