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

const slackValidationModule = createSlackValidationModule();

const customizationModule = createCustomizationProvisioningModule();

const qaKnowledgeModule = createQAKnowledgeTrainingModule();

const llmValidationModule = createLLMValidationModule();
// Future sub-features plug in here — one import, one mount, nothing else changes:
// const { createAvatarGenerationSubModule } = require('./avatar-generation');
// const { createQaGenerationSubModule }     = require('./qa-generation');
// const { createVoiceGenerationSubModule }  = require('./voice-generation');
// const { createKnowledgeBaseSubModule }    = require('./knowledge-base');

/**
 * createChatbotModule — top-level composition root for the entire chatbot
 * feature and all its sub-features.
 *
 * Responsibilities:
 *   - Accept shared cross-cutting dependencies (authGuard, etc.) from the
 *     monolith and forward them to sub-features that need them.
 *   - Mount each sub-feature's router under the correct path prefix.
 *   - Return a single router the monolith (or standalone.js) registers
 *     under '/api/chatbot' (or any other mount path).
 *
 * Sub-features are independent of each other — they are wired here, not
 * inside one another. Adding a new sub-feature = one import + one mount
 * below. No other file in this module changes (Open/Closed Principle).
 *
 * @param {object} [opts]
 * @param {Function} [opts.authGuard] — auth middleware injected by the monolith
 * @returns {{ router: import('express').Router }}
 */
function createChatbotModule({ authMiddleware } = {}) {
  const router = express.Router();

  // ── Website Scraping ───────────────────────────────────────────────────────
  const { router: webScrapingRouter } = createWebScrapingSubModule({ authGuard: authMiddleware });
  router.use('/scrape', webScrapingRouter);
  const { router: avatarRouter } = createAvatarGenerationSubModule({ authMiddleware });
  router.use('/avatar', avatarRouter);
  const { router: creationRouter } = createChatbotCreationModule({
    provisionBotAgentsUseCase: humanAgentModule.provisionBotAgentsUseCase,

    validateSlackWorkspaceUseCase: slackValidationModule.validateSlackWorkspaceUseCase,

    createDefaultCustomizationUseCase: customizationModule.createDefaultCustomizationUseCase,

    trainKnowledgeBaseUseCase: qaKnowledgeModule.trainKnowledgeBaseUseCase,

    validateLLMConnectionUseCase: llmValidationModule.validateLLMConnectionUseCase,
  });
  router.use('/creation', creationRouter);

  // ── Future sub-features ────────────────────────────────────────────────────
  // const { router: avatarRouter }    = createAvatarGenerationSubModule({ authMiddleware });
  // const { router: qaRouter }        = createQaGenerationSubModule({ authMiddleware });
  // const { router: voiceRouter }     = createVoiceGenerationSubModule({ authMiddleware });
  // const { router: knowledgeRouter } = createKnowledgeBaseSubModule({ authMiddleware });
  //
  // router.use('/avatar',        avatarRouter);
  // router.use('/qa',            qaRouter);
  // router.use('/voice',         voiceRouter);
  // router.use('/knowledge-base', knowledgeRouter);

  return { router };
}

module.exports = { createChatbotModule };
