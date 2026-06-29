'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createSearchRoutes({ searchController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   GET /search
   * @desc    Global search across all resources
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(searchController.global));

  /**
   * @route   GET /search/tickets
   * @desc    Search tickets
   * @access  Private
   */
  router.get('/tickets', authMiddleware.requireAuth, asyncHandler(searchController.tickets));

  /**
   * @route   GET /search/conversations
   * @desc    Search conversations/threads
   * @access  Private
   */
  router.get('/conversations', authMiddleware.requireAuth, asyncHandler(searchController.conversations));

  /**
   * @route   GET /search/knowledge
   * @desc    Search knowledge base
   * @access  Private
   */
  router.get('/knowledge', authMiddleware.requireAuth, asyncHandler(searchController.knowledge));

  /**
   * @route   GET /search/users
   * @desc    Search users
   * @access  Private
   */
  router.get('/users', authMiddleware.requireAuth, asyncHandler(searchController.users));

  /**
   * @route   GET /search/channels
   * @desc    Search channels
   * @access  Private
   */
  router.get('/channels', authMiddleware.requireAuth, asyncHandler(searchController.channels));

  return router;
};
