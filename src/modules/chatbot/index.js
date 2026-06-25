'use strict';

const express = require('express');
const { createWebScrapingSubModule } = require('./webScraping/index');
const { createAvatarGenerationSubModule } = require('./videoAvatarGeneration/index');
const { createChatbotCreationModule } = require('./creation/index');
const { createHumanAgentProvisioningModule } = require('../humanAgent/provisioning');
const { createSlackValidationModule } = require('../slackIntegration/validation');
const { createCustomizationProvisioningModule } = require('../customization/provisioning');
const { createQAKnowledgeTrainingModule } = require('../qaKnowledge/training');
const { createLLMValidationModule } = require('../llm/validation');

const humanAgentModule = createHumanAgentProvisioningModule();
const slackModule = createSlackValidationModule();
const customizationModule = createCustomizationProvisioningModule();
const qaKnowledgeModule = createQAKnowledgeTrainingModule();
const llmValidationModule = createLLMValidationModule();

function createChatbotModule({ authMiddleware } = {}) {
  const router = express.Router();

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

  return { router };
}

module.exports = { createChatbotModule };
