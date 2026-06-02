const logger = require('../utils/logger');
const BotRegressionTest = require('../models/BotRegressionTest');
const QAHistory = require('../models/QAHistory');
const { runPhoenixSpan, setPhoenixSpanAttributes } = require('../config/phoenixTracing');
const { getLLMClient } = require('../utils/llmClientUtils');

exports.createRegressionTestSuite = async (botId, userId) => {
  try {
    logger.info('Creating regression test suite from production conversations', {
      botId,
      userId,
    });

    // Get low-confidence and handoff conversations
    const [lowConfidence, handoffs, negativeRatings] = await Promise.all([
      QAHistory.find({ bot: botId, score: { $lt: 0.85 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      QAHistory.find({ bot: botId, handoffRequested: true })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      QAHistory.find({
        bot: botId,
        userRating: { $lte: 2, $exists: true },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    // Convert conversations to test cases
    const testCases = [];

    lowConfidence.forEach((qa, idx) => {
      testCases.push({
        questionId: `low_conf_${qa._id}`,
        question: qa.question || 'N/A',
        expectedAnswer: qa.answer || 'N/A',
        priority: qa.score < 0.65 ? 'high' : 'medium',
        source: 'low_confidence',
        createdFrom: {
          sessionId: qa.sessionId,
          score: qa.score,
        },
      });
    });

    handoffs.forEach((qa) => {
      testCases.push({
        questionId: `handoff_${qa._id}`,
        question: qa.question || 'N/A',
        expectedAnswer: qa.answer || 'N/A',
        priority: 'high',
        source: 'handoff',
        createdFrom: {
          sessionId: qa.sessionId,
        },
      });
    });

    negativeRatings.forEach((qa) => {
      testCases.push({
        questionId: `negative_${qa._id}`,
        question: qa.question || 'N/A',
        expectedAnswer: qa.answer || 'N/A',
        priority: 'medium',
        source: 'negative_feedback',
        createdFrom: {
          sessionId: qa.sessionId,
          score: qa.userRating,
        },
      });
    });

    // Create test suite
    const testSuite = new BotRegressionTest({
      bot: botId,
      user: userId,
      name: `Auto-generated tests - ${new Date().toISOString().split('T')[0]}`,
      description: 'Regression tests created from production conversations',
      testCases,
      status: 'active',
      statistics: {
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: 0,
        regressions: 0,
        improvements: 0,
      },
    });

    await testSuite.save();

    logger.info('Regression test suite created', {
      botId,
      totalTests: testCases.length,
    });

    return testSuite;
  } catch (error) {
    logger.error('Error creating regression test suite', {
      error: error.message,
      botId,
    });
    throw error;
  }
};

exports.getBotRegressionTests = async (botId, userId) => {
  try {
    const tests = await BotRegressionTest.find({
      bot: botId,
      user: userId,
    })
      .select('-testRuns')
      .sort({ createdAt: -1 })
      .lean();

    return tests || [];
  } catch (error) {
    logger.error('Error fetching regression tests', {
      error: error.message,
      botId,
    });
    throw error;
  }
};

exports.runRegressionTests = async (botId, testSuiteId, botVersionId) => {
  return runPhoenixSpan('runRegressionTests', 'INTERNAL', { botId, testSuiteId }, async (span) => {
    try {
      logger.info('Running regression tests', {
        botId,
        testSuiteId,
        botVersionId,
      });

      const testSuite = await BotRegressionTest.findOne({
        _id: testSuiteId,
        bot: botId,
      });

      if (!testSuite) {
        throw new Error('Test suite not found');
      }

      const testCases = testSuite.testCases || [];
      const testRuns = [];
      let passed = 0;
      let failed = 0;
      let improved = 0;
      let regressed = 0;
      const llmClient = await getLLMClient(botId);

      // Run each test case
      for (const testCase of testCases) {
        try {
          const botResponse = await llmClient.generateSummary(
            `Answer the following question as the bot would:

${testCase.question}`
          );

          const evaluationPrompt = `
Question: ${testCase.question}
Expected Answer: ${testCase.expectedAnswer}
Bot Answer: ${botResponse}

Rate the bot's answer on:
1. Relevance (0-1): Does it address the question?
2. Groundedness (0-1): Is it factually correct compared to expected answer?

Respond only with JSON:
{"relevance": 0.0, "groundedness": 0.0, "explanation": "..."}
          `;

          const evaluation = await llmClient.generateSummary(evaluationPrompt);
          const evaluationJson = evaluation.match(/\{[\s\S]*\}/)?.[0] || null;
          let scores = { relevance: 0, groundedness: 0, explanation: 'Invalid evaluation response' };

          if (evaluationJson) {
            try {
              scores = JSON.parse(evaluationJson);
            } catch (parseError) {
              logger.warn('Failed to parse evaluation JSON', {
                evaluation,
                parseError: parseError.message,
              });
            }
          }

          const relevance = Number(scores.relevance ?? 0);
          const groundedness = Number(scores.groundedness ?? 0);
          const explanation = scores.explanation || 'No explanation provided';

          let verdict = 'passed';
          if (relevance < 0.7 || groundedness < 0.7) {
            verdict = 'failed';
            failed++;
          } else {
            passed++;
          }

          // Check for improvement/regression vs last run
          const lastRun = testSuite.testRuns?.filter(
            (r) => r.testCaseId.toString() === testCase._id?.toString()
          )?.[0];

          if (lastRun) {
            if (scores.relevance > lastRun.relevanceScore) {
              verdict = 'improved';
              improved++;
            } else if (scores.relevance < lastRun.relevanceScore) {
              verdict = 'regressed';
              regressed++;
            }
          }

          testRuns.push({
            testCaseId: testCase._id,
            botVersionId,
            actualAnswer: botResponse,
            relevanceScore: scores.relevance,
            groundednessScore: scores.groundedness,
            verdict,
            explanation: scores.explanation,
            runAt: new Date(),
          });

          setPhoenixSpanAttributes(span, {
            'test_case_id': testCase._id?.toString(),
            'verdict': verdict,
            'relevance_score': scores.relevance,
          });
        } catch (testError) {
          logger.error('Error running individual test', {
            error: testError.message,
            testCaseId: testCase._id,
          });
          testRuns.push({
            testCaseId: testCase._id,
            botVersionId,
            actualAnswer: 'ERROR',
            relevanceScore: 0,
            groundednessScore: 0,
            verdict: 'failed',
            explanation: testError.message,
            runAt: new Date(),
          });
          failed++;
        }
      }

      // Update test suite statistics
      testSuite.statistics = {
        totalTests: testCases.length,
        passedTests: passed,
        failedTests: failed,
        regressions: regressed,
        improvements: improved,
      };
      testSuite.lastRunAt = new Date();
      testSuite.testRuns = testRuns;

      await testSuite.save();

      logger.info('Regression tests completed', {
        botId,
        passed,
        failed,
        improved,
        regressed,
      });

      return {
        testSuiteId,
        statistics: testSuite.statistics,
        testRuns,
        summary: {
          improved,
          regressed,
          message:
            improved > 0 && regressed > 0
              ? `Your changes improved ${improved} answers but broke ${regressed} previous answers.`
              : improved > 0
                ? `Great! Your changes improved ${improved} answers.`
                : regressed > 0
                  ? `Warning: Your changes broke ${regressed} previous answers.`
                  : 'No changes detected in test results.',
        },
      };
    } catch (error) {
      logger.error('Error in runRegressionTests', {
        error: error.message,
        botId,
      });
      throw error;
    }
  });
};

exports.getRegressionTestSuite = async (botId, testSuiteId) => {
  try {
    const suite = await BotRegressionTest.findOne({
      _id: testSuiteId,
      bot: botId,
    });

    if (!suite) {
      throw new Error('Test suite not found');
    }

    return suite;
  } catch (error) {
    logger.error('Error fetching regression test suite', {
      error: error.message,
      testSuiteId,
    });
    throw error;
  }
};

exports.addTestCaseToSuite = async (botId, testSuiteId, testCaseData) => {
  try {
    const suite = await BotRegressionTest.findOne({
      _id: testSuiteId,
      bot: botId,
    });

    if (!suite) {
      throw new Error('Test suite not found');
    }

    suite.testCases.push({
      questionId: `manual_${Date.now()}`,
      question: testCaseData.question,
      expectedAnswer: testCaseData.expectedAnswer,
      priority: testCaseData.priority || 'medium',
      source: 'manual',
    });

    suite.statistics = suite.statistics || {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      regressions: 0,
      improvements: 0,
    };
    suite.statistics.totalTests = suite.testCases.length;
    suite.updatedAt = new Date();

    await suite.save();

    logger.info('Test case added to suite', {
      botId,
      testSuiteId,
    });

    return suite;
  } catch (error) {
    logger.error('Error adding test case', {
      error: error.message,
      testSuiteId,
    });
    throw error;
  }
};
