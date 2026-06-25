'use strict';

const MongoChatbotRepository = require('./infrastructure/persistence/MongoChatbotRepository');
const ChatBotModel = require('../models/ChatbotModel');

const HumanAgentProvisioningAdapter = require('./infrastructure/integrations/HumanAgentProvisioningAdapter');
const SlackValidationAdapter = require('./infrastructure/integrations/SlackValidationAdapter');
const SlackJoinAdapter = require('./infrastructure/integrations/SlackJoinAdapter');
const CustomizationProvisioningAdapter = require('./infrastructure/integrations/CustomizationProvisioningAdapter');
const QAKnowledgeProvisioningAdapter = require('./infrastructure/integrations/QAKnowledgeProvisioningAdapter');
const LLMValidationAdapter = require('./infrastructure/integrations/LLMValidationAdapter');
const EncryptionAdapter = require('./infrastructure/security/EncryptionAdapter');

const ChatbotCreationOrchestrator = require('./application/orchestrators/ChatbotCreationOrchestrator');
const CreateChatbotUseCase = require('./application/usecases/CreateChatbotUseCase');

const ChatbotCreationController = require('./api/controllers/ChatbotCreationController');
const { createChatbotCreationRoutes } = require('./api/routes/ChatbotCreationRoutes');

const logger = require('../../shared/logging');
const responseBuilder = require('../../shared/response/ApiResponse');

function createChatbotCreationModule({
  authMiddleware,
  provisionBotAgentsUseCase,
  validateSlackWorkspaceUseCase,
  joinSlackChannelUseCase,
  createDefaultCustomizationUseCase,
  trainKnowledgeBaseUseCase,
  validateLLMConnectionUseCase,
}) {
  const chatbotRepository = new MongoChatbotRepository({ ChatBotModel });

  const humanAgentProvisioningService = new HumanAgentProvisioningAdapter({
    provisionBotAgentsUseCase,
  });

  const slackValidationService = new SlackValidationAdapter({
    validateSlackWorkspaceUseCase,
  });

  const slackJoinService = new SlackJoinAdapter({
    joinSlackChannelUseCase,
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

  const encryptionService = new EncryptionAdapter();

  const chatbotCreationOrchestrator = new ChatbotCreationOrchestrator({
    chatbotRepository,
    humanAgentProvisioningService,
    slackValidationService,
    slackJoinService,
    customizationProvisioningService,
    qaKnowledgeProvisioningService,
    llmValidationService,
    logger,
  });

  const createChatbotUseCase = new CreateChatbotUseCase({
    chatbotCreationOrchestrator,
    encryptionService,
  });

  const chatbotCreationController = new ChatbotCreationController({
    createChatbotUseCase,
    logger,
    responseBuilder,
  });

  const router = createChatbotCreationRoutes({
    chatbotCreationController,
    authMiddleware,
  });

  return { router };
}

module.exports = { createChatbotCreationModule };
