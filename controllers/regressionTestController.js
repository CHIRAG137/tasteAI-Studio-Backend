const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const regressionTestService = require('../services/regressionTestService');

exports.createRegressionTests = async (req, res) => {
  const { botId } = req.params;

  try {
    logger.info('Creating regression test suite', { botId, userId: req.user?.id });

    const testSuite = await regressionTestService.createRegressionTestSuite(
      botId,
      req.user?.id,
      {
        name: req.body?.name,
        description: req.body?.description,
      }
    );

    return responseBuilder.ok(
      res,
      testSuite,
      'Regression test suite created from production conversations'
    );
  } catch (error) {
    logger.error('Error creating regression tests', {
      error: error.message,
      botId,
      userId: req.user?.id,
    });

    if (error.message?.includes('No production conversations')) {
      return responseBuilder.badRequest(res, null, error.message);
    }

    return responseBuilder.internalError(
      res,
      null,
      error.message || 'Failed to create regression test suite'
    );
  }
};

exports.getRegressionTests = async (req, res) => {
  const { botId } = req.params;

  try {
    const tests = await regressionTestService.getBotRegressionTests(botId, req.user?.id);

    return responseBuilder.ok(
      res,
      tests,
      'Regression test suites retrieved successfully'
    );
  } catch (error) {
    logger.error('Error fetching regression tests', {
      error: error.message,
      botId,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch regression tests'
    );
  }
};

exports.runRegressionTests = async (req, res) => {
  const { botId, testSuiteId } = req.params;
  const { botVersionId } = req.body;

  try {
    logger.info('Running regression tests', {
      botId,
      testSuiteId,
      botVersionId,
      userId: req.user?.id,
    });

    const results = await regressionTestService.runRegressionTests(
      botId,
      testSuiteId,
      botVersionId || 'current',
      req.user?.id
    );

    return responseBuilder.ok(res, results, 'Regression tests executed successfully');
  } catch (error) {
    logger.error('Error running regression tests', {
      error: error.message,
      botId,
      testSuiteId,
    });

    if (
      error.message === 'Test suite not found' ||
      error.message?.includes('no test cases')
    ) {
      return responseBuilder.badRequest(res, null, error.message);
    }

    return responseBuilder.internalError(
      res,
      null,
      error.message || 'Failed to run regression tests'
    );
  }
};

exports.getTestSuiteDetails = async (req, res) => {
  const { botId, testSuiteId } = req.params;

  try {
    const suite = await regressionTestService.getRegressionTestSuite(botId, testSuiteId);

    return responseBuilder.ok(
      res,
      suite,
      'Test suite details retrieved successfully'
    );
  } catch (error) {
    logger.error('Error fetching test suite details', {
      error: error.message,
      testSuiteId,
    });

    if (error.message === 'Test suite not found') {
      return responseBuilder.notFound(res, null, 'Test suite not found');
    }

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch test suite details'
    );
  }
};

exports.addTestCase = async (req, res) => {
  const { botId, testSuiteId } = req.params;
  const { question, expectedAnswer, priority } = req.body;

  try {
    if (!question || !expectedAnswer) {
      return responseBuilder.badRequest(
        res,
        null,
        'Question and expected answer are required'
      );
    }

    logger.info('Adding test case to suite', {
      botId,
      testSuiteId,
      userId: req.user?.id,
    });

    const updatedSuite = await regressionTestService.addTestCaseToSuite(
      botId,
      testSuiteId,
      {
        question,
        expectedAnswer,
        priority,
      }
    );

    return responseBuilder.ok(
      res,
      updatedSuite,
      'Test case added successfully'
    );
  } catch (error) {
    logger.error('Error adding test case', {
      error: error.message,
      testSuiteId,
    });

    if (error.message === 'Test suite not found') {
      return responseBuilder.notFound(res, null, 'Test suite not found');
    }

    return responseBuilder.internalError(
      res,
      null,
      'Failed to add test case'
    );
  }
};
