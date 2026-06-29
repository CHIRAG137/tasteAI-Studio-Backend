const express = require('express');

const router = express.Router();

const botController = require('../controllers/botController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { optionalUserAuth } = require('../middlewares/optionalUserAuthMiddleware');
const { attachIpAddress } = require('../middlewares/ipExtractorMiddleware');

router.use(attachIpAddress);

/**
 * @route   POST /api/bots/test-custom-llm
 * @desc    Validate a custom LLM provider, API key, and model before saving
 * @access  Private
 */
router.post('/test-custom-llm', authMiddleware, botController.testCustomLLMConnection);

/**
 * @route   POST /api/bots/ask
 * @desc    Ask a question to a chatbot (public inference endpoint)
 * @access  Public
 */
router.post('/ask', optionalUserAuth, botController.askBot);

/**
 * @route   GET /api/bots/:botId/history
 * @desc    Get paginated chat session history for a chatbot
 * @access  Private
 */
router.get('/:botId/history', authMiddleware, botController.getAllChatHistoriesByBotId);

/**
 * @route   GET /api/bots/:botId/history/:sessionId
 * @desc    Get full chat history for a specific session
 * @access  Private
 */
router.get('/:botId/history/:sessionId', authMiddleware, botController.getChatHistoryBySessionId);

/**
 * @route   GET /api/bots/:botId/history/:sessionId/trace
 * @desc    Get product-friendly Phoenix trace timeline for a specific session
 * @access  Private
 */
router.get(
  '/:botId/history/:sessionId/trace',
  authMiddleware,
  botController.getSessionTraceTimeline,
);

/**
 * @route   GET /api/bots/:botId/spreadsheet-config
 * @desc    Get spreadsheet configuration for a bot
 * @access  Private
 */
router.get('/:botId/spreadsheet-config', authMiddleware, botController.getSpreadsheetConfig);

/**
 * @route   POST /api/bots/:botId/spreadsheet-config/columns
 * @desc    Configure output and input columns for spreadsheet analysis
 * @access  Private
 */
router.post(
  '/:botId/spreadsheet-config/columns',
  authMiddleware,
  botController.configureSpreadsheetColumns,
);

/**
 * @route   GET /api/bots/:botId/spreadsheet-config/suggestions
 * @desc    Get Gemini's AI suggestions for column configuration
 * @access  Private
 */
router.get(
  '/:botId/spreadsheet-config/suggestions',
  authMiddleware,
  botController.getSuggestedColumnConfiguration,
);

/**
 * @route   GET /api/bots/:botId/observability
 * @desc    Get Arize/Phoenix MCP setup and bot self-improvement insights
 * @access  Private
 */
router.get('/:botId/observability', authMiddleware, botController.getBotObservabilityInsights);

/**
 * @route   GET /api/bots/:botId/improvements
 * @desc    Get bot health and self-improvement inbox items
 * @access  Private
 */
router.get('/:botId/improvements', authMiddleware, botController.getBotSelfImprovementDashboard);

/**
 * @route   POST /api/bots/:botId/improvements/actions
 * @desc    Apply an action to a bot self-improvement item
 * @access  Private
 */
router.post(
  '/:botId/improvements/actions',
  authMiddleware,
  botController.applyBotImprovementAction,
);

/**
 * @route   GET /api/bots/:botId/improvements/introspect/history
 * @desc    Get paginated self-introspection history for a bot
 * @access  Private
 */
router.get(
  '/:botId/improvements/introspect/history',
  authMiddleware,
  botController.getBotSelfIntrospectionHistory,
);

/**
 * @route   POST /api/bots/:botId/improvements/introspect
 * @desc    Ask the private Phoenix MCP self-introspection tool about bot failures
 * @access  Private
 */
router.post(
  '/:botId/improvements/introspect',
  authMiddleware,
  botController.askBotSelfIntrospection,
);

/**
 * @route   GET /api/bots/:botId/autopilot
 * @desc    Get bot autopilot recommendation config and recent runs
 * @access  Private
 */
router.get('/:botId/autopilot', authMiddleware, botController.getBotAutopilot);

/**
 * @route   PUT /api/bots/:botId/autopilot
 * @desc    Save bot autopilot schedule, prompt, and notification settings
 * @access  Private
 */
router.put('/:botId/autopilot', authMiddleware, botController.saveBotAutopilot);

/**
 * @route   POST /api/bots/:botId/autopilot/generate
 * @desc    Generate autopilot recommendations (preview or send via email/Slack)
 * @access  Private
 */
router.post(
  '/:botId/autopilot/generate',
  authMiddleware,
  botController.generateBotAutopilotRecommendations,
);

/**
 * @route   GET /api/bots/:botId/monitoring
 * @desc    Get production monitoring alert config, snapshot, and active alerts
 * @access  Private
 */
router.get('/:botId/monitoring', authMiddleware, botController.getBotMonitoring);

/**
 * @route   PUT /api/bots/:botId/monitoring
 * @desc    Save monitoring alert rules and notification settings
 * @access  Private
 */
router.put('/:botId/monitoring', authMiddleware, botController.saveBotMonitoring);

/**
 * @route   POST /api/bots/:botId/monitoring/evaluate
 * @desc    Run monitoring threshold checks (optionally notify)
 * @access  Private
 */
router.post('/:botId/monitoring/evaluate', authMiddleware, botController.evaluateBotMonitoring);

/**
 * @route   POST /api/bots/:botId/monitoring/alerts/:alertId/acknowledge
 * @desc    Acknowledge a monitoring alert
 * @access  Private
 */
router.post(
  '/:botId/monitoring/alerts/:alertId/acknowledge',
  authMiddleware,
  botController.acknowledgeMonitoringAlert,
);

/**
 * @route   POST /api/bots/:botId/monitoring/alerts/:alertId/resolve
 * @desc    Resolve a monitoring alert
 * @access  Private
 */
router.post(
  '/:botId/monitoring/alerts/:alertId/resolve',
  authMiddleware,
  botController.resolveMonitoringAlert,
);

/**
 * @route   GET /api/bots/:botId/eval-datasets
 * @desc    List eval datasets and judge runs for a bot
 * @access  Private
 */
router.get('/:botId/eval-datasets', authMiddleware, botController.getBotEvalDatasets);

/**
 * @route   POST /api/bots/:botId/eval-datasets/build
 * @desc    Build a Phoenix-ready eval dataset from production conversations
 * @access  Private
 */
router.post('/:botId/eval-datasets/build', authMiddleware, botController.buildBotEvalDataset);

/**
 * @route   GET /api/bots/:botId/eval-dataset-types
 * @desc    List custom eval dataset types for a bot
 * @access  Private
 */
router.get('/:botId/eval-dataset-types', authMiddleware, botController.getBotEvalDatasetTypes);

/**
 * @route   POST /api/bots/:botId/eval-dataset-types
 * @desc    Create a custom eval dataset type with trace filters
 * @access  Private
 */
router.post('/:botId/eval-dataset-types', authMiddleware, botController.createBotEvalDatasetType);

/**
 * @route   DELETE /api/bots/:botId/eval-dataset-types/:typeId
 * @desc    Delete a custom eval dataset type
 * @access  Private
 */
router.delete(
  '/:botId/eval-dataset-types/:typeId',
  authMiddleware,
  botController.deleteBotEvalDatasetType,
);

/**
 * @route   POST /api/bots/:botId/evals/judge
 * @desc    Run LLM-as-a-Judge grading over a bot eval dataset
 * @access  Private
 */
router.post('/:botId/evals/judge', authMiddleware, botController.runBotLLMJudge);

/**
 * @route   GET /api/bots/:botId/experiments
 * @desc    List bot experiment lab runs
 * @access  Private
 */
router.get('/:botId/experiments', authMiddleware, botController.getBotExperiments);

/**
 * @route   POST /api/bots/:botId/experiments
 * @desc    Create a control/treatment bot experiment
 * @access  Private
 */
router.post('/:botId/experiments', authMiddleware, botController.createBotExperiment);

/**
 * @route   POST /api/bots/:botId/experiments/:experimentId/run
 * @desc    Run a bot experiment against eval datasets
 * @access  Private
 */
router.post(
  '/:botId/experiments/:experimentId/run',
  authMiddleware,
  botController.runBotExperiment,
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
  regressionTestController.createRegressionTests,
);

/**
 * @route   GET /api/bots/:botId/regression-tests
 * @desc    Get all regression test suites for a bot
 * @access  Private
 */
router.get('/:botId/regression-tests', authMiddleware, regressionTestController.getRegressionTests);

/**
 * @route   POST /api/bots/:botId/regression-tests/:testSuiteId/run
 * @desc    Run regression tests for a test suite
 * @access  Private
 */
router.post(
  '/:botId/regression-tests/:testSuiteId/run',
  authMiddleware,
  regressionTestController.runRegressionTests,
);

/**
 * @route   GET /api/bots/:botId/regression-tests/:testSuiteId
 * @desc    Get details of a specific test suite
 * @access  Private
 */
router.get(
  '/:botId/regression-tests/:testSuiteId',
  authMiddleware,
  regressionTestController.getTestSuiteDetails,
);

/**
 * @route   POST /api/bots/:botId/regression-tests/:testSuiteId/test-cases
 * @desc    Add a new test case to a test suite
 * @access  Private
 */
router.post(
  '/:botId/regression-tests/:testSuiteId/test-cases',
  authMiddleware,
  regressionTestController.addTestCase,
);

module.exports = router;
