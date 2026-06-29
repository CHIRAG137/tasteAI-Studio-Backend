'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createSkillRoutes({ skillController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /skills
   * @desc    Register a new skill (e.g., ticketing, hr, sales)
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(skillController.register));

  /**
   * @route   GET /skills
   * @desc    List all registered skills
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(skillController.list));

  /**
   * @route   GET /skills/:skillId
   * @desc    Get skill details
   * @access  Private
   */
  router.get('/:skillId', authMiddleware.requireAuth, asyncHandler(skillController.getById));

  /**
   * @route   POST /skills/:skillId/toggle
   * @desc    Enable or disable skill
   * @access  Private
   */
  router.post('/:skillId/toggle', authMiddleware.requireAuth, asyncHandler(skillController.toggle));

  /**
   * @route   PATCH /skills/:skillId/config
   * @desc    Configure skill settings
   * @access  Private
   */
  router.patch('/:skillId/config', authMiddleware.requireAuth, asyncHandler(skillController.configure));

  /**
   * @route   POST /skills/:skillId/execute
   * @desc    Execute a skill
   * @access  Private
   */
  router.post('/:skillId/execute', authMiddleware.requireAuth, asyncHandler(skillController.execute));

  /**
   * @route   GET /skills/:skillId/versions
   * @desc    List skill versions
   * @access  Private
   */
  router.get('/:skillId/versions', authMiddleware.requireAuth, asyncHandler(skillController.getVersions));

  return router;
};
