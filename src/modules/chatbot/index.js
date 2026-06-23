'use strict';

const express = require('express');
const { createWebScrapingSubModule } = require('./webScraping/index');

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
function createChatbotModule({ authGuard } = {}) {
  const router = express.Router();

  // ── Website Scraping ───────────────────────────────────────────────────────
  const { router: webScrapingRouter } = createWebScrapingSubModule({ authGuard });
  router.use('/scrape', webScrapingRouter);

  // ── Future sub-features ────────────────────────────────────────────────────
  // const { router: avatarRouter }    = createAvatarGenerationSubModule({ authGuard });
  // const { router: qaRouter }        = createQaGenerationSubModule({ authGuard });
  // const { router: voiceRouter }     = createVoiceGenerationSubModule({ authGuard });
  // const { router: knowledgeRouter } = createKnowledgeBaseSubModule({ authGuard });
  //
  // router.use('/avatar',        avatarRouter);
  // router.use('/qa',            qaRouter);
  // router.use('/voice',         voiceRouter);
  // router.use('/knowledge-base', knowledgeRouter);

  return { router };
}

module.exports = { createChatbotModule };
