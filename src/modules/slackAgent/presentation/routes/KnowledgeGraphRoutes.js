'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createKnowledgeGraphRoutes({ knowledgeGraphController, authMiddleware }) {
  const router = express.Router();

  // Search
  router.get(
    '/:workspaceId/search',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.searchText),
  );

  // Natural language search via LLM
  router.post(
    '/:workspaceId/search',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.searchWithLLM),
  );

  // Find messages mentioning a user
  router.get(
    '/:workspaceId/mentions',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.findMentions),
  );

  // Find messages between two users
  router.get(
    '/:workspaceId/between-users',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.findMessagesBetweenUsers),
  );

  // Get subgraph around a node
  router.get(
    '/:workspaceId/nodes/:nodeId/subgraph',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.getSubgraph),
  );

  // Find path between two users
  router.get(
    '/:workspaceId/path',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.findPath),
  );

  // Get graph stats
  router.get(
    '/:workspaceId/stats',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.getStats),
  );

  // ── New Endpoints ──

  // Get available node types
  router.get(
    '/node-types',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.getNodeTypes),
  );

  // Search entities by type (e.g., /entities/technology, /entities/person)
  router.get(
    '/:workspaceId/entities/:entityType',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.searchByEntityType),
  );

  // Search messages by intent (e.g., /intent/question, /intent/decision)
  router.get(
    '/:workspaceId/intent/:intent',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.searchByIntent),
  );

  // Get entity graph (nodes + edges for a specific entity type)
  router.get(
    '/:workspaceId/entity-graph/:entityType',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.getEntityGraph),
  );

  // Get full graph (all nodes + their edges for the workspace)
  router.get(
    '/:workspaceId/full-graph',
    authMiddleware.requireAuth,
    asyncHandler(knowledgeGraphController.getFullGraph),
  );

  return router;
};
