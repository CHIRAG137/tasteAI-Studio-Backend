const logger = require('../utils/logger');
const BotRegressionTest = require('../models/BotRegressionTest');
const BotInteractionMetric = require('../models/BotInteractionMetric');
const HandoffSession = require('../models/HandoffSession');
const ChatBot = require('../models/ChatBot');
const { runPhoenixSpan, setPhoenixSpanAttributes } = require('../config/phoenixTracing');
const { getLLMClient } = require('../utils/llmClientUtils');
const botService = require('./botService');

const MAX_TEST_CASES = 30;
const PASS_THRESHOLD = 0.7;

function normalizeQuestion(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function formatSuiteDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildSuiteName(botName, customName) {
  if (customName && String(customName).trim()) {
    return String(customName).trim();
  }
  return `Production regression · ${botName} · ${formatSuiteDate()}`;
}

function buildSuiteDescription(counts) {
  const parts = [];
  if (counts.low_confidence) {
    parts.push(`${counts.low_confidence} low-confidence`);
  }
  if (counts.handoff) {
    parts.push(`${counts.handoff} handoff`);
  }
  if (counts.negative_feedback) {
    parts.push(`${counts.negative_feedback} negative feedback`);
  }
  if (counts.unanswered) {
    parts.push(`${counts.unanswered} unanswered`);
  }
  if (!parts.length) {
    return 'No production signals matched yet.';
  }
  return `Captured from production traces: ${parts.join(', ')}.`;
}

function addTestCase(testCases, seen, candidate) {
  const key = normalizeQuestion(candidate.question);
  if (!key || key === 'n/a' || seen.has(key)) {
    return;
  }
  seen.add(key);
  testCases.push(candidate);
}

async function collectProductionTestCases(botId) {
  const [lowConfidence, unanswered, handoffs, negativeFeedback] = await Promise.all([
    BotInteractionMetric.find({
      bot: botId,
      $or: [{ confidence: { $lt: 0.85 } }, { confidence: null }],
      question: { $exists: true, $ne: '' },
    })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
    BotInteractionMetric.find({
      bot: botId,
      $or: [{ usedFallback: true }, { source: 'none' }],
      question: { $exists: true, $ne: '' },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    HandoffSession.find({ bot: botId, userQuestion: { $exists: true, $ne: '' } })
      .sort({ requestedAt: -1 })
      .limit(20)
      .lean(),
    HandoffSession.find({
      bot: botId,
      $or: [{ userRating: { $lte: 2 } }, { userFeedback: { $exists: true, $ne: '' } }],
      userQuestion: { $exists: true, $ne: '' },
    })
      .sort({ requestedAt: -1 })
      .limit(15)
      .lean(),
  ]);

  const testCases = [];
  const seen = new Set();
  const counts = {
    low_confidence: 0,
    unanswered: 0,
    handoff: 0,
    negative_feedback: 0,
  };

  lowConfidence.forEach((metric) => {
    const before = testCases.length;
    addTestCase(testCases, seen, {
      questionId: `low_conf_${metric._id}`,
      question: metric.question,
      expectedAnswer: metric.answer || '',
      priority:
        typeof metric.confidence === 'number' && metric.confidence < 0.65 ? 'high' : 'medium',
      source: 'low_confidence',
      createdFrom: {
        sessionId: metric.flowSession ? String(metric.flowSession) : undefined,
        score: metric.confidence,
      },
    });
    if (testCases.length > before) {
      counts.low_confidence += 1;
    }
  });

  unanswered.forEach((metric) => {
    const before = testCases.length;
    addTestCase(testCases, seen, {
      questionId: `unanswered_${metric._id}`,
      question: metric.question,
      expectedAnswer: metric.answer || '',
      priority: 'high',
      source: 'low_confidence',
      createdFrom: {
        sessionId: metric.flowSession ? String(metric.flowSession) : undefined,
        score: metric.confidence,
      },
    });
    if (testCases.length > before) {
      counts.unanswered += 1;
    }
  });

  handoffs.forEach((handoff) => {
    const before = testCases.length;
    addTestCase(testCases, seen, {
      questionId: `handoff_${handoff._id}`,
      question: handoff.userQuestion,
      expectedAnswer: handoff.agentNotes || '',
      priority: handoff.escalated ? 'high' : 'medium',
      source: 'handoff',
      createdFrom: {
        sessionId: handoff.flowSession ? String(handoff.flowSession) : undefined,
      },
    });
    if (testCases.length > before) {
      counts.handoff += 1;
    }
  });

  negativeFeedback.forEach((handoff) => {
    const before = testCases.length;
    addTestCase(testCases, seen, {
      questionId: `negative_${handoff._id}`,
      question: handoff.userQuestion,
      expectedAnswer: handoff.agentNotes || '',
      priority: 'medium',
      source: 'negative_feedback',
      createdFrom: {
        sessionId: handoff.flowSession ? String(handoff.flowSession) : undefined,
        score: handoff.userRating,
      },
    });
    if (testCases.length > before) {
      counts.negative_feedback += 1;
    }
  });

  return {
    testCases: testCases.slice(0, MAX_TEST_CASES),
    counts,
  };
}

function parseEvaluationScores(raw) {
  const evaluationJson = raw.match(/\{[\s\S]*\}/)?.[0] || null;
  let scores = { relevance: 0, groundedness: 0, explanation: 'Invalid evaluation response' };

  if (evaluationJson) {
    try {
      scores = JSON.parse(evaluationJson);
    } catch (parseError) {
      logger.warn('Failed to parse regression evaluation JSON', {
        parseError: parseError.message,
      });
    }
  }

  return {
    relevance: Number(scores.relevance ?? 0),
    groundedness: Number(scores.groundedness ?? 0),
    explanation: scores.explanation || 'No explanation provided',
  };
}

function resolveVerdict({ relevance, groundedness, lastRun }) {
  const meetsThreshold = relevance >= PASS_THRESHOLD && groundedness >= PASS_THRESHOLD;

  if (!lastRun) {
    return meetsThreshold ? 'passed' : 'failed';
  }

  const previousScore = (Number(lastRun.relevanceScore) + Number(lastRun.groundednessScore)) / 2;
  const currentScore = (relevance + groundedness) / 2;

  if (currentScore > previousScore + 0.05) {
    return 'improved';
  }
  if (currentScore < previousScore - 0.05) {
    return 'regressed';
  }
  return meetsThreshold ? 'passed' : 'failed';
}

exports.createRegressionTestSuite = async (botId, userId, options = {}) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const { testCases, counts } = await collectProductionTestCases(botId);
  if (!testCases.length) {
    throw new Error(
      'No production conversations matched yet. Chat with the bot or build eval datasets first, then try again.',
    );
  }

  const testSuite = new BotRegressionTest({
    bot: botId,
    user: userId,
    name: buildSuiteName(bot.name || 'Bot', options.name),
    description: options.description?.trim() || buildSuiteDescription(counts),
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
};

exports.getBotRegressionTests = async (botId, userId) => {
  const tests = await BotRegressionTest.find({
    bot: botId,
    user: userId,
  })
    .select('-testRuns')
    .sort({ createdAt: -1 })
    .lean();

  return tests || [];
};

exports.runRegressionTests = async (botId, testSuiteId, botVersionId, userId) => {
  return runPhoenixSpan('runRegressionTests', 'INTERNAL', { botId, testSuiteId }, async (span) => {
    const testSuite = await BotRegressionTest.findOne({
      _id: testSuiteId,
      bot: botId,
    });

    if (!testSuite) {
      throw new Error('Test suite not found');
    }

    const testCases = testSuite.testCases || [];
    if (!testCases.length) {
      throw new Error(
        'This suite has no test cases. Create a new suite from production conversations.',
      );
    }

    const bot = await ChatBot.findById(botId).lean();
    if (!bot) {
      throw new Error('Bot not found');
    }

    const llmClient = await getLLMClient(bot, userId);
    const previousRunsByCase = new Map(
      (testSuite.testRuns || []).map((run) => [String(run.testCaseId), run]),
    );

    const testRuns = [];
    let passed = 0;
    let failed = 0;
    let improved = 0;
    let regressed = 0;

    for (const testCase of testCases) {
      try {
        const botResult = await botService.askBot(testCase.question, botId, null, userId);
        const botResponse = botResult?.answer || '';

        const evaluationPrompt = `Question: ${testCase.question}
Expected Answer: ${testCase.expectedAnswer || 'No expected answer recorded'}
Bot Answer: ${botResponse}

Rate the bot's answer on:
1. Relevance (0-1): Does it address the question?
2. Groundedness (0-1): Is it aligned with the expected answer?

Respond only with JSON:
{"relevance": 0.0, "groundedness": 0.0, "explanation": "..."}`;

        const evaluation = await llmClient.generateSummary(evaluationPrompt);
        const scores = parseEvaluationScores(evaluation);
        const lastRun = previousRunsByCase.get(String(testCase._id));
        const verdict = resolveVerdict({
          relevance: scores.relevance,
          groundedness: scores.groundedness,
          lastRun,
        });

        if (verdict === 'passed') {
          passed += 1;
        } else if (verdict === 'failed') {
          failed += 1;
        } else if (verdict === 'improved') {
          improved += 1;
        } else if (verdict === 'regressed') {
          regressed += 1;
        }

        testRuns.push({
          testCaseId: testCase._id,
          botVersionId: botVersionId || 'current',
          actualAnswer: botResponse,
          relevanceScore: scores.relevance,
          groundednessScore: scores.groundedness,
          verdict,
          explanation: scores.explanation,
          runAt: new Date(),
        });

        setPhoenixSpanAttributes(span, {
          test_case_id: testCase._id?.toString(),
          verdict,
          relevance_score: scores.relevance,
        });
      } catch (testError) {
        logger.error('Error running individual regression test', {
          error: testError.message,
          testCaseId: testCase._id,
        });

        failed += 1;
        testRuns.push({
          testCaseId: testCase._id,
          botVersionId: botVersionId || 'current',
          actualAnswer: 'ERROR',
          relevanceScore: 0,
          groundednessScore: 0,
          verdict: 'failed',
          explanation: testError.message,
          runAt: new Date(),
        });
      }
    }

    testSuite.statistics = {
      totalTests: testCases.length,
      passedTests: passed,
      failedTests: failed,
      regressions: regressed,
      improvements: improved,
    };
    testSuite.lastRunAt = new Date();
    testSuite.testRuns = [...testRuns, ...(testSuite.testRuns || [])].slice(0, 200);

    await testSuite.save();

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
                : failed > 0
                  ? `${failed} of ${testCases.length} tests did not meet the quality threshold.`
                  : `All ${passed} tests passed.`,
      },
    };
  });
};

exports.getRegressionTestSuite = async (botId, testSuiteId) => {
  const suite = await BotRegressionTest.findOne({
    _id: testSuiteId,
    bot: botId,
  });

  if (!suite) {
    throw new Error('Test suite not found');
  }

  return suite;
};

exports.addTestCaseToSuite = async (botId, testSuiteId, testCaseData) => {
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
  return suite;
};
