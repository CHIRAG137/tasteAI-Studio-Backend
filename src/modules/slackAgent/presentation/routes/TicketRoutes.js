'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createTicketRoutes({ ticketController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /tickets
   * @desc    Create a new ticket
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(ticketController.create));

  /**
   * @route   GET /tickets
   * @desc    List tickets with optional filters
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(ticketController.list));

  /**
   * @route   GET /tickets/search
   * @desc    Search tickets
   * @access  Private
   */
  router.get('/search', authMiddleware.requireAuth, asyncHandler(ticketController.search));

  /**
   * @route   GET /tickets/:ticketId
   * @desc    Get ticket details
   * @access  Private
   */
  router.get('/:ticketId', authMiddleware.requireAuth, asyncHandler(ticketController.getById));

  /**
   * @route   PATCH /tickets/:ticketId
   * @desc    Update ticket fields
   * @access  Private
   */
  router.patch('/:ticketId', authMiddleware.requireAuth, asyncHandler(ticketController.update));

  /**
   * @route   POST /tickets/:ticketId/close
   * @desc    Close ticket
   * @access  Private
   */
  router.post('/:ticketId/close', authMiddleware.requireAuth, asyncHandler(ticketController.close));

  /**
   * @route   POST /tickets/:ticketId/reopen
   * @desc    Reopen closed ticket
   * @access  Private
   */
  router.post('/:ticketId/reopen', authMiddleware.requireAuth, asyncHandler(ticketController.reopen));

  /**
   * @route   POST /tickets/:ticketId/assign
   * @desc    Assign ticket to user
   * @access  Private
   */
  router.post('/:ticketId/assign', authMiddleware.requireAuth, asyncHandler(ticketController.assign));

  /**
   * @route   POST /tickets/:ticketId/unassign
   * @desc    Unassign ticket
   * @access  Private
   */
  router.post('/:ticketId/unassign', authMiddleware.requireAuth, asyncHandler(ticketController.unassign));

  /**
   * @route   POST /tickets/:ticketId/transfer
   * @desc    Transfer ticket to another user
   * @access  Private
   */
  router.post('/:ticketId/transfer', authMiddleware.requireAuth, asyncHandler(ticketController.transfer));

  /**
   * @route   POST /tickets/:ticketId/merge
   * @desc    Merge other tickets into this ticket
   * @access  Private
   */
  router.post('/:ticketId/merge', authMiddleware.requireAuth, asyncHandler(ticketController.merge));

  /**
   * @route   POST /tickets/:ticketId/split
   * @desc    Split ticket into multiple tickets
   * @access  Private
   */
  router.post('/:ticketId/split', authMiddleware.requireAuth, asyncHandler(ticketController.split));

  /**
   * @route   POST /tickets/:ticketId/comments
   * @desc    Add comment to ticket
   * @access  Private
   */
  router.post('/:ticketId/comments', authMiddleware.requireAuth, asyncHandler(ticketController.addComment));

  /**
   * @route   POST /tickets/:ticketId/attachments
   * @desc    Add attachment to ticket
   * @access  Private
   */
  router.post('/:ticketId/attachments', authMiddleware.requireAuth, asyncHandler(ticketController.addAttachment));

  /**
   * @route   GET /tickets/:ticketId/timeline
   * @desc    Get ticket activity timeline
   * @access  Private
   */
  router.get('/:ticketId/timeline', authMiddleware.requireAuth, asyncHandler(ticketController.getTimeline));

  /**
   * @route   GET /tickets/:ticketId/history
   * @desc    Get ticket change history
   * @access  Private
   */
  router.get('/:ticketId/history', authMiddleware.requireAuth, asyncHandler(ticketController.getHistory));

  /**
   * @route   POST /tickets/:ticketId/watch
   * @desc    Start watching ticket
   * @access  Private
   */
  router.post('/:ticketId/watch', authMiddleware.requireAuth, asyncHandler(ticketController.watch));

  /**
   * @route   POST /tickets/:ticketId/follow
   * @desc    Start following ticket
   * @access  Private
   */
  router.post('/:ticketId/follow', authMiddleware.requireAuth, asyncHandler(ticketController.follow));

  return router;
};
