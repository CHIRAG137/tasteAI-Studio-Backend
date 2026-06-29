'use strict';

const { createCustomizationProvisioningModule } = require('./provisioning');

const MongoCustomizationRepository = require('./infrastructure/persistence/MongoCustomizationRepository');
const BotQueryAdapter = require('./infrastructure/adapters/BotQueryAdapter');
const CustomizationModel = require('./models/CustomizationModel');
const ChatBotModel = require('../../chatbot/models/ChatbotModel');

const GetCustomizationUseCase = require('./application/usecases/GetCustomizationUseCase');
const UpdateCustomizationUseCase = require('./application/usecases/UpdateCustomizationUseCase');

const CustomizationController = require('./api/controllers/CustomizationController');
const { createCustomizationRoutes } = require('./api/routes/CustomizationRoutes');

const logger = require('../../shared/logging');
const responseBuilder = require('../../shared/response/ApiResponse');

function createCustomizationModule({ authMiddleware } = {}) {
  const customizationRepository = new MongoCustomizationRepository({ CustomizationModel });
  const botQuery = new BotQueryAdapter({ chatBotModel: ChatBotModel });

  const getCustomizationUseCase = new GetCustomizationUseCase({
    customizationRepository,
    botQuery,
  });

  const updateCustomizationUseCase = new UpdateCustomizationUseCase({
    customizationRepository,
    botQuery,
  });

  const customizationController = new CustomizationController({
    getCustomizationUseCase,
    updateCustomizationUseCase,
    responseBuilder,
    logger,
  });

  const router = createCustomizationRoutes({
    customizationController,
    authMiddleware,
  });

  return { router };
}

module.exports = {
  createCustomizationModule,
  createCustomizationProvisioningModule,
};
