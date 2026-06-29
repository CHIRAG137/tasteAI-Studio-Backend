'use strict';

const express = require('express');
const { createWebScrapingSubModule } = require('./webScraping/index');
const { createAvatarGenerationSubModule } = require('./videoAvatarGeneration/index');
const { createChatbotCreationModule } = require('./creation/index');
const { createChatbotManagementModule } = require('./management/index');
const { createHumanAgentProvisioningModule } = require('../humanAgent/provisioning');
const { createSlackValidationModule } = require('../slackIntegration/validation');
const { createCustomizationProvisioningModule } = require('../customization/provisioning');
const { createQAKnowledgeTrainingModule } = require('../qaKnowledge/training');
const { createLLMValidationModule } = require('../llm/validation');
const EncryptionAdapter = require('./creation/infrastructure/security/EncryptionAdapter');

const humanAgentModule = createHumanAgentProvisioningModule();
const slackModule = createSlackValidationModule();
const customizationModule = createCustomizationProvisioningModule();
const qaKnowledgeModule = createQAKnowledgeTrainingModule();
const llmValidationModule = createLLMValidationModule();

function createChatbotModule({ authMiddleware } = {}) {
  const router = express.Router();
  const encryptionService = new EncryptionAdapter();

  const { router: webScrapingRouter } = createWebScrapingSubModule({ authGuard: authMiddleware });
  router.use('/scrape', webScrapingRouter);

  const { router: avatarRouter } = createAvatarGenerationSubModule({ authGuard: authMiddleware });
  router.use('/avatar', avatarRouter);

  const { router: creationRouter } = createChatbotCreationModule({
    authMiddleware,
    provisionBotAgentsUseCase: humanAgentModule.provisionBotAgentsUseCase,
    validateSlackWorkspaceUseCase: slackModule.validateSlackWorkspaceUseCase,
    joinSlackChannelUseCase: slackModule.joinSlackChannelUseCase,
    createDefaultCustomizationUseCase: customizationModule.createDefaultCustomizationUseCase,
    trainKnowledgeBaseUseCase: qaKnowledgeModule.trainKnowledgeBaseUseCase,
    validateLLMConnectionUseCase: llmValidationModule.validateLLMConnectionUseCase,
  });
  router.use('/creation', creationRouter);

  const { router: managementRouter } = createChatbotManagementModule({
    authMiddleware,
    encryptionService,
  });
  router.use('/management', managementRouter);

  return { router };
}

module.exports = { createChatbotModule };
