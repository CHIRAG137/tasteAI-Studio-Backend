'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createEventRoutes({ eventController }) {
  const router = express.Router();

  /**
   * @route   POST /events/ingest
   * @desc    Ingest Slack event (message, mention, reaction, etc.)
   * @access  Public (called by Slack)
   */
  router.post('/ingest', asyncHandler(eventController.ingest));

  /**
   * @route   GET /events
   * @desc    List processed events
   * @access  Private
   */
  router.get('/', asyncHandler(eventController.list));

  /**
   * @route   POST /events/:eventId/replay
   * @desc    Replay a failed event
   * @access  Private
   */
  router.post('/:eventId/replay', asyncHandler(eventController.replay));

  return router;
};
