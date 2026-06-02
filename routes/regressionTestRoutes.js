const express = require('express');
const regressionTestController = require('../controllers/regressionTestController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * @route   POST /api/bots/:botId/regression-tests
 * @desc    Create regression test suite from production conversations
 * @access  Private
 */
router.post('/:botId/regression-tests', regressionTestController.createRegressionTests);

/**
 * @route   GET /api/bots/:botId/regression-tests
 * @desc    Get all regression test suites for a bot
 * @access  Private
 */
router.get('/:botId/regression-tests', regressionTestController.getRegressionTests);

/**
 * @route   POST /api/bots/:botId/regression-tests/:testSuiteId/run
 * @desc    Run regression tests for a test suite
 * @access  Private
 */
router.post(
  '/:botId/regression-tests/:testSuiteId/run',
  regressionTestController.runRegressionTests
);

/**
 * @route   GET /api/bots/:botId/regression-tests/:testSuiteId
 * @desc    Get details of a specific test suite
 * @access  Private
 */
router.get(
  '/:botId/regression-tests/:testSuiteId',
  regressionTestController.getTestSuiteDetails
);

/**
 * @route   POST /api/bots/:botId/regression-tests/:testSuiteId/test-cases
 * @desc    Add a new test case to a test suite
 * @access  Private
 */
router.post(
  '/:botId/regression-tests/:testSuiteId/test-cases',
  regressionTestController.addTestCase
);

module.exports = router;
