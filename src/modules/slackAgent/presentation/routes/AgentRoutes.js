'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createAgentRoutes({ agentController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /agents
   * @desc    Create a new AI agent
   * @access  Private
   */
  router.post('/', authMiddleware.requireAuth, asyncHandler(agentController.create));

  /**
   * @route   GET /agents
   * @desc    List all agents for organization
   * @access  Private
   */
  router.get('/', authMiddleware.requireAuth, asyncHandler(agentController.list));

  /**
   * @route   GET /agents/:agentId
   * @desc    Get agent details
   * @access  Private
   */
  router.get('/:agentId', authMiddleware.requireAuth, asyncHandler(agentController.getById));

  /**
   * @route   PATCH /agents/:agentId
   * @desc    Update agent
   * @access  Private
   */
  router.patch('/:agentId', authMiddleware.requireAuth, asyncHandler(agentController.update));

  /**
   * @route   DELETE /agents/:agentId
   * @desc    Delete agent
   * @access  Private
   */
  router.delete('/:agentId', authMiddleware.requireAuth, asyncHandler(agentController.delete));

  /**
   * @route   POST /agents/:agentId/clone
   * @desc    Clone an existing agent
   * @access  Private
   */
  router.post('/:agentId/clone', authMiddleware.requireAuth, asyncHandler(agentController.clone));

  /**
   * @route   POST /agents/:agentId/toggle
   * @desc    Enable or disable agent
   * @access  Private
   */
  router.post('/:agentId/toggle', authMiddleware.requireAuth, asyncHandler(agentController.toggle));

  /**
   * @route   POST /agents/:agentId/channels
   * @desc    Assign channels to agent
   * @access  Private
   */
  router.post('/:agentId/channels', authMiddleware.requireAuth, asyncHandler(agentController.assignChannels));

  /**
   * @route   PATCH /agents/:agentId/skills
   * @desc    Update skills attached to agent
   * @access  Private
   */
  router.patch('/:agentId/skills', authMiddleware.requireAuth, asyncHandler(agentController.updateSkills));

  /**
   * @route   PATCH /agents/:agentId/permissions
   * @desc    Update agent permissions
   * @access  Private
   */
  router.patch('/:agentId/permissions', authMiddleware.requireAuth, asyncHandler(agentController.updatePermissions));

  /**
   * @route   POST /agents/:agentId/mcp-servers
   * @desc    Assign MCP servers to agent
   * @access  Private
   */
  router.post('/:agentId/mcp-servers', authMiddleware.requireAuth, asyncHandler(agentController.assignMCPServers));

  /**
   * @route   POST /agents/:agentId/webhooks
   * @desc    Assign webhooks to agent
   * @access  Private
   */
  router.post('/:agentId/webhooks', authMiddleware.requireAuth, asyncHandler(agentController.assignWebhooks));

  /**
   * @route   PATCH /agents/:agentId/connectors
   * @desc    Update agent connector configuration
   * @access  Private
   */
  router.patch('/:agentId/connectors', authMiddleware.requireAuth, asyncHandler(agentController.updateConnectors));

  /**
   * @route   GET /agents/:agentId/connectors
   * @desc    List all connectors configured for an agent
   * @access  Private
   */
  router.get('/:agentId/connectors', authMiddleware.requireAuth, asyncHandler(agentController.listConnectors));

  return router;
};
