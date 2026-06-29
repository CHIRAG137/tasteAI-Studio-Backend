'use strict';

const MongoChatbotManagementRepository = require('./infrastructure/persistence/MongoChatbotManagementRepository');
const ChatBotModel = require('../models/ChatbotModel');

const ListChatbotsUseCase = require('./application/usecases/ListChatbotsUseCase');
const GetChatbotUseCase = require('./application/usecases/GetChatbotUseCase');
const DeleteChatbotUseCase = require('./application/usecases/DeleteChatbotUseCase');
const UpdateChatbotUseCase = require('./application/usecases/UpdateChatbotUseCase');

const ChatbotManagementController = require('./api/controllers/ChatbotManagementController');
const { createChatbotManagementRoutes } = require('./api/routes/ChatbotManagementRoutes');

const logger = require('../../shared/logging');
const responseBuilder = require('../../shared/response/ApiResponse');

function createChatbotManagementModule({ authMiddleware, encryptionService } = {}) {
  const managementRepository = new MongoChatbotManagementRepository({ ChatBotModel });

  const listChatbotsUseCase = new ListChatbotsUseCase({ managementRepository });
  const getChatbotUseCase = new GetChatbotUseCase({ managementRepository });
  const deleteChatbotUseCase = new DeleteChatbotUseCase({ managementRepository });
  const updateChatbotUseCase = new UpdateChatbotUseCase({
    managementRepository,
    encryptionService,
  });

  const managementController = new ChatbotManagementController({
    listChatbotsUseCase,
    getChatbotUseCase,
    deleteChatbotUseCase,
    updateChatbotUseCase,
    responseBuilder,
    logger,
  });

  const router = createChatbotManagementRoutes({
    managementController,
    authMiddleware,
  });

  return { router };
}

module.exports = { createChatbotManagementModule };
