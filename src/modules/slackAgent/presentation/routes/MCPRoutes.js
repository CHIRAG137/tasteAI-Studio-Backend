'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createMCPRoutes({ mcpController, authMiddleware }) {
  const router = express.Router();

  /**
   * @route   POST /mcp/servers
   * @desc    Register a new MCP server connection
   * @access  Private
   */
  router.post('/servers', authMiddleware.requireAuth, asyncHandler(mcpController.register));

  /**
   * @route   GET /mcp/servers
   * @desc    List MCP server connections
   * @access  Private
   */
  router.get('/servers', authMiddleware.requireAuth, asyncHandler(mcpController.list));

  /**
   * @route   GET /mcp/servers/:connectionId
   * @desc    Get MCP server connection details
   * @access  Private
   */
  router.get(
    '/servers/:connectionId',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.getById),
  );

  /**
   * @route   PATCH /mcp/servers/:connectionId
   * @desc    Update MCP server connection
   * @access  Private
   */
  router.patch(
    '/servers/:connectionId',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.update),
  );

  /**
   * @route   DELETE /mcp/servers/:connectionId
   * @desc    Delete MCP server connection
   * @access  Private
   */
  router.delete(
    '/servers/:connectionId',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.delete),
  );

  /**
   * @route   POST /mcp/servers/:connectionId/connect
   * @desc    Connect to MCP server
   * @access  Private
   */
  router.post(
    '/servers/:connectionId/connect',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.connect),
  );

  /**
   * @route   POST /mcp/servers/:connectionId/disconnect
   * @desc    Disconnect from MCP server
   * @access  Private
   */
  router.post(
    '/servers/:connectionId/disconnect',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.disconnect),
  );

  /**
   * @route   GET /mcp/servers/:connectionId/tools
   * @desc    List available tools from MCP server
   * @access  Private
   */
  router.get(
    '/servers/:connectionId/tools',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.listTools),
  );

  /**
   * @route   POST /mcp/servers/:connectionId/execute
   * @desc    Execute a tool on MCP server
   * @access  Private
   */
  router.post(
    '/servers/:connectionId/execute',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.executeTool),
  );

  /**
   * @route   GET /mcp/servers/:connectionId/health
   * @desc    Check MCP server health
   * @access  Private
   */
  router.get(
    '/servers/:connectionId/health',
    authMiddleware.requireAuth,
    asyncHandler(mcpController.checkHealth),
  );

  return router;
};
