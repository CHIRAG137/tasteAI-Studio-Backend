'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createKnowledgeRoutes({ knowledgeController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /knowledge
   * @desc    Upload knowledge (PDF, URL, Notion, Google Drive, Confluence)
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(knowledgeController.upload));

  /**
   * @route   GET /knowledge
   * @desc    List knowledge entries
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(knowledgeController.list));

  /**
   * @route   GET /knowledge/search
   * @desc    Search knowledge base
   * @access  Private
   */
  router.get('/search', authMiddleware.requireAuth, asyncHandler(knowledgeController.search));

  /**
   * @route   GET /knowledge/:knowledgeId
   * @desc    Get knowledge entry details
   * @access  Private
   */
  router.get(
    '/:knowledgeId',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeController.getById),
  );

  /**
   * @route   POST /knowledge/:knowledgeId/index
   * @desc    Index knowledge for vector search
   * @access  Private
   */
  router.post(
    '/:knowledgeId/index',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeController.index),
  );

  /**
   * @route   POST /knowledge/:knowledgeId/refresh
   * @desc    Refresh knowledge (re-index)
   * @access  Private
   */
  router.post(
    '/:knowledgeId/refresh',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeController.refresh),
  );

  /**
   * @route   DELETE /knowledge/:knowledgeId
   * @desc    Delete knowledge entry
   * @access  Private
   */
  router.delete(
    '/:knowledgeId',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeController.delete),
  );

  return router;
};
