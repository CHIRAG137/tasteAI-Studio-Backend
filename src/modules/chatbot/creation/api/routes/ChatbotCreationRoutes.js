'use strict';

const express = require('express');

const uploadMiddleware = require('../middleware/ChatbotCreationUploadMiddleware');

function createChatbotCreationRoutes({ chatbotCreationController, authMiddleware }) {
  const router = express.Router();

  router.post(
    '/create',
    authMiddleware.requireAuth,
    uploadMiddleware,
    chatbotCreationController.createChatbot,
  );

  return router;
}

module.exports = {
  createChatbotCreationRoutes,
};
