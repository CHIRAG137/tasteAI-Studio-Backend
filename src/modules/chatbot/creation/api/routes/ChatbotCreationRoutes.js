'use strict';

const express = require('express');

const asyncHandler = require('../../../../shared/middleware/asyncHandler');

const uploadMiddleware = require('../middleware/ChatbotCreationUploadMiddleware');

function createChatbotCreationRoutes({ chatbotCreationController, authMiddleware }) {
  const router = express.Router();

  const guard = authMiddleware ?? ((req, res, next) => next());

  router.post(
    '/create',
    guard,
    uploadMiddleware,
    asyncHandler(chatbotCreationController.createChatbot),
  );

  return router;
}

module.exports = {
  createChatbotCreationRoutes,
};
