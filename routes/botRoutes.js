const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const botController = require('../controllers/botController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { optionalUserAuth } = require('../middlewares/optionalUserAuthMiddleware');

/**
 * @route   POST /api/bots/create
 * @desc    Create a new chatbot with optional training files (PDF, TXT, DOC/DOCX, XLS/XLSX, CSV) or scraped content
 * @access  Private (Authenticated user)
 */
router.post(
  '/create',
  authMiddleware,
  upload.array('files'),
  botController.createBot
);

/**
 * @route   POST /api/bots/test-custom-llm
 * @desc    Validate a custom LLM provider, API key, and model before saving
 * @access  Private
 */
router.post(
  '/test-custom-llm',
  authMiddleware,
  botController.testCustomLLMConnection
);

/**
 * @route   POST /api/bots/ask
 * @desc    Ask a question to a chatbot (public inference endpoint)
 * @access  Public
 */
router.post('/ask', botController.askBot);

/**
 * @route   GET /api/bots
 * @desc    Get all chatbots created by the authenticated user
 * @access  Private
 */
router.get('/', authMiddleware, botController.getAllChatBots);

/**
 * @route   GET /api/bots/:botId
 * @desc    Get details of a specific chatbot by bot ID
 * @access  Public / Private (depending on usage)
 */
router.get('/:botId', optionalUserAuth, botController.getBotByBotId);

/**
 * @route   DELETE /api/bots/:botId
 * @desc    Delete a chatbot owned by the authenticated user
 * @access  Private
 */
router.delete(
  '/:botId',
  authMiddleware,
  botController.deleteBotByBotId
);

/**
 * @route   PUT /api/bots/:botId
 * @desc    Update chatbot details, training data, integrations, or configuration
 *         Supports new file uploads for PDF, TXT, DOC/DOCX, XLS/XLSX, CSV ingestion
 * @access  Private
 */
router.put(
  '/:botId',
  authMiddleware,
  upload.array('files'),
  botController.updateBotByBotId
);

/**
 * @route   GET /api/bots/customisation/:botId
 * @desc    Get UI / behavior customization settings for a chatbot
 * @access  Public / Private
 */
router.get(
  '/customisation/:botId',
  optionalUserAuth,
  botController.getBotCustomizationByBotId
);

/**
 * @route   POST /api/bots/customisation/:botId
 * @desc    Save or update chatbot customization settings
 * @access  Private
 */
router.post(
  '/customisation/:botId',
  authMiddleware,
  botController.saveBotCustomization
);

/**
 * @route   GET /api/bots/:botId/history
 * @desc    Get paginated chat session history for a chatbot
 * @access  Private
 */
router.get(
  '/:botId/history',
  authMiddleware,
  botController.getAllChatHistoriesByBotId
);

/**
 * @route   GET /api/bots/:botId/history/:sessionId
 * @desc    Get full chat history for a specific session
 * @access  Private
 */
router.get(
  '/:botId/history/:sessionId',
  authMiddleware,
  botController.getChatHistoryBySessionId
);

/**
 * @route   GET /api/bots/:botId/spreadsheet-config
 * @desc    Get spreadsheet configuration for a bot
 * @access  Private
 */
router.get(
  '/:botId/spreadsheet-config',
  authMiddleware,
  botController.getSpreadsheetConfig
);

/**
 * @route   POST /api/bots/:botId/spreadsheet-config/columns
 * @desc    Configure output and input columns for spreadsheet analysis
 * @access  Private
 */
router.post(
  '/:botId/spreadsheet-config/columns',
  authMiddleware,
  botController.configureSpreadsheetColumns
);

/**
 * @route   GET /api/bots/:botId/spreadsheet-config/suggestions
 * @desc    Get Gemini's AI suggestions for column configuration
 * @access  Private
 */
router.get(
  '/:botId/spreadsheet-config/suggestions',
  authMiddleware,
  botController.getSuggestedColumnConfiguration
);

module.exports = router;
