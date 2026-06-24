'use strict';

const express = require('express');

const uploadMiddleware = require('../middleware/ChatbotCreationUploadMiddleware');

function createChatbotCreationRoutes({ chatbotCreationController, authGuard }) {
  const router = express.Router();

  router.post('/create', authGuard, uploadMiddleware, chatbotCreationController.createChatbot);

  return router;
}

module.exports = {
  createChatbotCreationRoutes,
};
