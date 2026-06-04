const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const botController = require('../controllers/botController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { optionalUserAuth } = require('../middlewares/optionalUserAuthMiddleware');
const { attachIpAddress } = require('../middlewares/ipExtractorMiddleware');

router.use(attachIpAddress);

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
router.post('/ask', optionalUserAuth, botController.askBot);

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
 * @route   GET /api/bots/:botId/history/:sessionId/trace
 * @desc    Get product-friendly Phoenix trace timeline for a specific session
 * @access  Private
 */
router.get(
  '/:botId/history/:sessionId/trace',
  authMiddleware,
  botController.getSessionTraceTimeline
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

/**
 * @route   GET /api/bots/:botId/observability
 * @desc    Get Arize/Phoenix MCP setup and bot self-improvement insights
 * @access  Private
 */
router.get(
  '/:botId/observability',
  authMiddleware,
  botController.getBotObservabilityInsights
);

/**
 * @route   GET /api/bots/:botId/improvements
 * @desc    Get bot health and self-improvement inbox items
 * @access  Private
 */
router.get(
  '/:botId/improvements',
  authMiddleware,
  botController.getBotSelfImprovementDashboard
);

/**
 * @route   POST /api/bots/:botId/improvements/actions
 * @desc    Apply an action to a bot self-improvement item
 * @access  Private
 */
router.post(
  '/:botId/improvements/actions',
  authMiddleware,
  botController.applyBotImprovementAction
);

/**
 * @route   POST /api/bots/:botId/improvements/introspect
 * @desc    Ask the private Phoenix MCP self-introspection tool about bot failures
 * @access  Private
 */
router.post(
  '/:botId/improvements/introspect',
  authMiddleware,
  botController.askBotSelfIntrospection
);

/**
 * @route   GET /api/bots/:botId/eval-datasets
 * @desc    List eval datasets and judge runs for a bot
 * @access  Private
 */
router.get(
  '/:botId/eval-datasets',
  authMiddleware,
  botController.getBotEvalDatasets
);

/**
 * @route   POST /api/bots/:botId/eval-datasets/build
 * @desc    Build a Phoenix-ready eval dataset from production conversations
 * @access  Private
 */
router.post(
  '/:botId/eval-datasets/build',
  authMiddleware,
  botController.buildBotEvalDataset
);

/**
 * @route   POST /api/bots/:botId/evals/judge
 * @desc    Run LLM-as-a-Judge grading over a bot eval dataset
 * @access  Private
 */
router.post(
  '/:botId/evals/judge',
  authMiddleware,
  botController.runBotLLMJudge
);

/**
 * @route   GET /api/bots/:botId/experiments
 * @desc    List bot experiment lab runs
 * @access  Private
 */
router.get(
  '/:botId/experiments',
  authMiddleware,
  botController.getBotExperiments
);

/**
 * @route   POST /api/bots/:botId/experiments
 * @desc    Create a control/treatment bot experiment
 * @access  Private
 */
router.post(
  '/:botId/experiments',
  authMiddleware,
  botController.createBotExperiment
);

/**
 * @route   POST /api/bots/:botId/experiments/:experimentId/run
 * @desc    Run a bot experiment against eval datasets
 * @access  Private
 */
router.post(
  '/:botId/experiments/:experimentId/run',
  authMiddleware,
  botController.runBotExperiment
);

const regressionTestController = require('../controllers/regressionTestController');

/**
 * @route   POST /api/bots/:botId/regression-tests
 * @desc    Create regression test suite from production conversations
 * @access  Private
 */
router.post(
  '/:botId/regression-tests',
  authMiddleware,
  regressionTestController.createRegressionTests
);

/**
 * @route   GET /api/bots/:botId/regression-tests
 * @desc    Get all regression test suites for a bot
 * @access  Private
 */
router.get(
  '/:botId/regression-tests',
  authMiddleware,
  regressionTestController.getRegressionTests
);

/**
 * @route   POST /api/bots/:botId/regression-tests/:testSuiteId/run
 * @desc    Run regression tests for a test suite
 * @access  Private
 */
router.post(
  '/:botId/regression-tests/:testSuiteId/run',
  authMiddleware,
  regressionTestController.runRegressionTests
);

/**
 * @route   GET /api/bots/:botId/regression-tests/:testSuiteId
 * @desc    Get details of a specific test suite
 * @access  Private
 */
router.get(
  '/:botId/regression-tests/:testSuiteId',
  authMiddleware,
  regressionTestController.getTestSuiteDetails
);

/**
 * @route   POST /api/bots/:botId/regression-tests/:testSuiteId/test-cases
 * @desc    Add a new test case to a test suite
 * @access  Private
 */
router.post(
  '/:botId/regression-tests/:testSuiteId/test-cases',
  authMiddleware,
  regressionTestController.addTestCase
);

module.exports = router;
