const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const botController = require('../controllers/botController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/bots/create
 * @desc    Create a new chatbot with optional training data (PDF / scraped content)
 * @access  Private (Authenticated user)
 */
router.post(
  '/create',
  authMiddleware,
  upload.single('file'),
  botController.createBot
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
router.get('/:botId', botController.getBotByBotId);

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
 * @access  Private
 */
router.put(
  '/:botId',
  authMiddleware,
  upload.single('file'),
  botController.updateBotByBotId
);

/**
 * @route   GET /api/bots/customisation/:botId
 * @desc    Get UI / behavior customization settings for a chatbot
 * @access  Public / Private
 */
router.get(
  '/customisation/:botId',
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

module.exports = router;
