'use strict';

const express = require('express');
const asyncHandler = require('../../../../shared/middleware/asyncHandler');

function createChatbotManagementRoutes({ managementController, authMiddleware }) {
  const router = express.Router();
  const guard = authMiddleware ?? ((req, res, next) => next());

  router.get('/', guard, asyncHandler(managementController.listChatbots));
  router.get('/:botId', guard, asyncHandler(managementController.getChatbot));
  router.delete('/:botId', guard, asyncHandler(managementController.deleteChatbot));
  router.put('/:botId', guard, asyncHandler(managementController.updateChatbot));

  return router;
}

module.exports = { createChatbotManagementRoutes };
