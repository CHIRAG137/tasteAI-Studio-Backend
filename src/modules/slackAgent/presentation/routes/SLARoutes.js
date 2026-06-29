'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createSLARoutes({ slaController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /sla-policies
   * @desc    Create a new SLA policy
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(slaController.create));

  /**
   * @route   GET /sla-policies
   * @desc    List SLA policies
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(slaController.list));

  /**
   * @route   GET /sla-policies/:slaId
   * @desc    Get SLA policy details
   * @access  Private
   */
  router.get('/:slaId', authMiddleware.requireAuth, asyncHandler(slaController.getById));

  /**
   * @route   PATCH /sla-policies/:slaId
   * @desc    Update SLA policy
   * @access  Private
   */
  router.patch('/:slaId', authMiddleware.requireAuth, asyncHandler(slaController.update));

  /**
   * @route   DELETE /sla-policies/:slaId
   * @desc    Delete SLA policy
   * @access  Private
   */
  router.delete('/:slaId', authMiddleware.requireAuth, asyncHandler(slaController.delete));

  return router;
};
