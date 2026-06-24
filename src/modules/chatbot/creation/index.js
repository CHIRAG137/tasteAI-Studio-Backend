'use strict';

/*
|--------------------------------------------------------------------------
| Repository
|--------------------------------------------------------------------------
*/

const MongoChatbotRepository = require('./infrastructure/persistence/MongoChatbotRepository');

const ChatBotModel = require('./infrastructure/models/ChatBotModel');

/*
|--------------------------------------------------------------------------
| Adapters
|--------------------------------------------------------------------------
*/

const HumanAgentProvisioningAdapter = require('./infrastructure/integrations/HumanAgentProvisioningAdapter');

const SlackValidationAdapter = require('./infrastructure/integrations/SlackValidationAdapter');

const CustomizationProvisioningAdapter = require('./infrastructure/integrations/CustomizationProvisioningAdapter');

const QAKnowledgeProvisioningAdapter = require('./infrastructure/integrations/QAKnowledgeProvisioningAdapter');

const LLMValidationAdapter = require('./infrastructure/integrations/LLMValidationAdapter');

/*
|--------------------------------------------------------------------------
| Application
|--------------------------------------------------------------------------
*/

const ChatbotCreationOrchestrator = require('./application/orchestrators/ChatbotCreationOrchestrator');

const CreateChatbotUseCase = require('./application/usecases/CreateChatbotUseCase');

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

const ChatbotCreationController = require('./api/controllers/ChatbotCreationController');

const { createChatbotCreationRoutes } = require('./api/routes/ChatbotCreationRoutes');

/*
|--------------------------------------------------------------------------
| Shared
|--------------------------------------------------------------------------
*/

const logger = require('../../shared/logger');

const responseBuilder = require('../../shared/responseBuilder');

function createChatbotCreationModule({
  authGuard,

  provisionBotAgentsUseCase,
  validateSlackWorkspaceUseCase,
  createDefaultCustomizationUseCase,
  trainKnowledgeBaseUseCase,
  validateLLMConnectionUseCase,
}) {
  /*
  |--------------------------------------------------------------------------
  | Repository
  |--------------------------------------------------------------------------
  */

  const chatbotRepository = new MongoChatbotRepository({
    ChatBotModel,
  });

  /*
  |--------------------------------------------------------------------------
  | Adapters
  |--------------------------------------------------------------------------
  */

  const humanAgentProvisioningService = new HumanAgentProvisioningAdapter({
    provisionBotAgentsUseCase,
  });

  const slackValidationService = new SlackValidationAdapter({
    validateSlackWorkspaceUseCase,
  });

  const customizationProvisioningService = new CustomizationProvisioningAdapter({
    createDefaultCustomizationUseCase,
  });

  const qaKnowledgeProvisioningService = new QAKnowledgeProvisioningAdapter({
    trainKnowledgeBaseUseCase,
  });

  const llmValidationService = new LLMValidationAdapter({
    validateLLMConnectionUseCase,
  });

  /*
  |--------------------------------------------------------------------------
  | Application
  |--------------------------------------------------------------------------
  */

  const chatbotCreationOrchestrator = new ChatbotCreationOrchestrator({
    chatbotRepository,

    humanAgentProvisioningService,

    slackValidationService,

    customizationProvisioningService,

    qaKnowledgeProvisioningService,

    llmValidationService,
  });

  const createChatbotUseCase = new CreateChatbotUseCase({
    chatbotCreationOrchestrator,
  });

  /*
  |--------------------------------------------------------------------------
  | API
  |--------------------------------------------------------------------------
  */

  const chatbotCreationController = new ChatbotCreationController({
    createChatbotUseCase,

    logger,

    responseBuilder,
  });

  const router = createChatbotCreationRoutes({
    chatbotCreationController,

    authGuard,
  });

  return {
    router,
  };
}

module.exports = {
  createChatbotCreationModule,
};
