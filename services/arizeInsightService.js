const ChatBot = require('../models/ChatBot');
const FlowSession = require('../models/FlowSession');
const QAHistory = require('../models/QAHistory');
const HandoffSession = require('../models/HandoffSession');
const BotEvalDatasetItem = require('../models/BotEvalDatasetItem');
const BotEvalRun = require('../models/BotEvalRun');
const BotInteractionMetric = require('../models/BotInteractionMetric');
const BotImprovementAction = require('../models/BotImprovementAction');
const humanHandoffService = require('./humanHandoffService');
const { generateEmbedding, getLLMClient } = require('../utils/llmClientUtils');
const { buildPhoenixMcpConfig } = require('../config/phoenixTracing');

function getQuestionText(entry) {
  return (
    entry?.question || entry?.message || entry?.content || entry?.text || ''
  );
}

function getAnswerText(entry) {
  return (
    entry?.answer || entry?.response || entry?.content || entry?.text || ''
  );
}

function flattenSessionQa(session) {
  const history = Array.isArray(session.history) ? session.history : [];
  return history
    .filter((item) => item?.mode === 'qa' || item?.question || item?.answer)
    .map((item) => ({
      sessionId: String(session._id),
      question: getQuestionText(item),
      answer: getAnswerText(item),
      score: typeof item.score === 'number' ? item.score : null,
      timestamp: item.timestamp || session.updatedAt || session.createdAt,
    }))
    .filter((item) => item.question || item.answer);
}

function average(values) {
  const clean = values.filter(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildBotHealthScore(metrics, handoffs) {
  const totalInteractions = metrics.length;
  const totalHandoffs = handoffs.length;
  const escalatedHandoffs = handoffs.filter(
    (handoff) => handoff.escalated || handoff.escalationHistory?.length
  ).length;
  const fallbackCount = metrics.filter((metric) => metric.usedFallback).length;
  const lowConfidenceCount = metrics.filter(
    (metric) =>
      typeof metric.confidence !== 'number' || metric.confidence < 0.85
  ).length;

  const answerConfidence = average(metrics.map((metric) => metric.confidence));
  const groundednessScore = average(
    metrics.map((metric) => metric.groundednessScore)
  );
  const avgLatencyMs = average(metrics.map((metric) => metric.latencyMs));
  const lowConfidenceRate = totalInteractions
    ? lowConfidenceCount / totalInteractions
    : 0;
  const fallbackRate = totalInteractions ? fallbackCount / totalInteractions : 0;
  const handoffEscalationRate = totalHandoffs
    ? escalatedHandoffs / totalHandoffs
    : 0;

  const confidenceScore =
    answerConfidence === null ? 72 : Math.max(0, answerConfidence * 100);
  const lowConfidenceScore = Math.max(0, 100 - lowConfidenceRate * 100);
  const groundednessComponent =
    groundednessScore === null ? 70 : Math.max(0, groundednessScore * 100);
  const latencyScore =
    avgLatencyMs === null
      ? 75
      : Math.max(0, 100 - Math.max(0, avgLatencyMs - 1500) / 80);
  const fallbackScore = Math.max(0, 100 - fallbackRate * 100);
  const handoffScore = Math.max(0, 100 - handoffEscalationRate * 100);

  const score = clampScore(
    confidenceScore * 0.25 +
      lowConfidenceScore * 0.18 +
      groundednessComponent * 0.22 +
      latencyScore * 0.12 +
      fallbackScore * 0.13 +
      handoffScore * 0.1
  );

  return {
    score,
    status: score >= 85 ? 'healthy' : score >= 70 ? 'watch' : 'needs_attention',
    trend: 'stable',
    sampleSize: totalInteractions,
    components: {
      answerConfidence: {
        value: answerConfidence,
        score: clampScore(confidenceScore),
      },
      lowConfidenceRate: {
        value: lowConfidenceRate,
        score: clampScore(lowConfidenceScore),
      },
      groundedness: {
        value: groundednessScore,
        score: clampScore(groundednessComponent),
      },
      latency: {
        valueMs: avgLatencyMs,
        score: clampScore(latencyScore),
      },
      fallbackRate: {
        value: fallbackRate,
        score: clampScore(fallbackScore),
      },
      handoffEscalationRate: {
        value: handoffEscalationRate,
        score: clampScore(handoffScore),
      },
    },
  };
}

function buildRecommendations({
  lowConfidenceQuestions,
  sourceBreakdown,
  totalQa,
  healthScore,
}) {
  const recommendations = [];

  if (healthScore?.score < 70) {
    recommendations.push({
      priority: 'high',
      title: 'Bot health needs attention',
      detail:
        'Review the self-improvement inbox and convert weak answers into eval examples or training Q&A.',
    });
  }

  if (lowConfidenceQuestions.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Add training coverage for low-confidence questions',
      detail:
        'Convert the low-confidence questions into Phoenix dataset examples and run an experiment before changing the production prompt.',
    });
  }

  if ((sourceBreakdown.none || 0) > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Tighten fallback behavior',
      detail:
        'Trace rows with source=none should become regression tests so the bot learns when to answer, ask a follow-up, or hand off.',
    });
  }

  if ((sourceBreakdown.llm || 0) > Math.max(3, totalQa * 0.5)) {
    recommendations.push({
      priority: 'medium',
      title: 'Promote good generated answers into curated knowledge',
      detail:
        'Review frequent LLM-generated answers and save the reliable ones as approved Q&A examples.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      title: 'Create a weekly Phoenix eval run',
      detail:
        'Use Phoenix MCP to pull recent traces, generate a dataset, and run judge-based relevance and helpfulness evals.',
    });
  }

  return recommendations;
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function datasetNameForSource(sourceType) {
  const names = {
    low_confidence_traces: 'Low Confidence Traces',
    handoff_sessions: 'Handoff Sessions',
    negative_feedback: 'Negative Feedback',
    unanswered_questions: 'Unanswered Questions',
  };
  return names[sourceType] || 'Production Conversations';
}

function buildDatasetRecord({ botId, sourceType, itemKey, question, answer, metadata, userId }) {
  return {
    bot: botId,
    itemKey,
    datasetName: datasetNameForSource(sourceType),
    sourceType,
    question,
    expectedAnswer: '',
    actualAnswer: answer || '',
    source: sourceType,
    metadata: metadata || {},
    createdBy: userId,
  };
}

function parseJudgeJson(text) {
  try {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

function normalizeJudgeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  if (number > 1) return Math.max(0, Math.min(1, number / 100));
  return Math.max(0, Math.min(1, number));
}

async function upsertDatasetItems(records) {
  const results = [];
  for (const record of records) {
    const saved = await BotEvalDatasetItem.findOneAndUpdate(
      { bot: record.bot, itemKey: record.itemKey },
      record,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    results.push(saved);
  }
  return results;
}

function buildImprovementItem(type, metric, overrides = {}) {
  const question = metric.question || 'Untitled question';
  return {
    key: `${type}:${metric._id || normalizeKey(question)}`,
    type,
    priority: overrides.priority || 'medium',
    title: overrides.title || question,
    description: overrides.description || '',
    question,
    answer: metric.answer || '',
    source: metric.source || 'unknown',
    confidence:
      typeof metric.confidence === 'number' && Number.isFinite(metric.confidence)
        ? metric.confidence
        : null,
    hallucinationRisk:
      typeof metric.hallucinationRisk === 'number' &&
      Number.isFinite(metric.hallucinationRisk)
        ? metric.hallucinationRisk
        : null,
    sessionId: metric.flowSession ? String(metric.flowSession) : null,
    createdAt: metric.createdAt,
    suggestedActions: [
      'add_to_eval_dataset',
      'create_training_qa',
      'mark_expected',
      'send_to_human_review',
    ],
    actionState: null,
  };
}

function mergeActionState(items, actions) {
  const actionMap = actions.reduce((acc, action) => {
    if (!acc[action.itemKey]) acc[action.itemKey] = [];
    acc[action.itemKey].push({
      action: action.action,
      status: action.status,
      createdAt: action.createdAt,
    });
    return acc;
  }, {});

  return items
    .filter((item) => {
      const itemActions = actionMap[item.key] || [];
      return !itemActions.some(
        (action) =>
          action.action === 'mark_expected' && action.status === 'completed'
      );
    })
    .map((item) => ({
      ...item,
      actionState: actionMap[item.key] || [],
    }));
}

async function loadHealthInputs(botId) {
  return Promise.all([
    BotInteractionMetric.find({ bot: botId })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    HandoffSession.find({ bot: botId })
      .sort({ requestedAt: -1 })
      .limit(100)
      .lean(),
  ]);
}

exports.getBotObservabilityInsights = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const [sessions, recentQa, totalQa] = await Promise.all([
    FlowSession.find({ bot: botId }).sort({ updatedAt: -1 }).limit(50).lean(),
    QAHistory.find({ bot: botId }).sort({ createdAt: -1 }).limit(50).lean(),
    QAHistory.countDocuments({ bot: botId }),
  ]);
  const [recentMetrics, handoffs] = await loadHealthInputs(botId);

  const sessionQa = sessions.flatMap(flattenSessionQa);
  const scoreValues = sessionQa
    .map((item) => item.score)
    .filter((score) => typeof score === 'number' && Number.isFinite(score));

  const metricConfidence = average(
    recentMetrics.map((metric) => metric.confidence)
  );
  const averageConfidence = scoreValues.length
    ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    : metricConfidence;

  const lowConfidenceQuestions = sessionQa
    .filter((item) => item.score === null || item.score < 0.85)
    .slice(0, 10);

  const sourceBreakdown = recentQa.reduce((acc, item) => {
    const source = item.source || 'llm';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const healthScore = buildBotHealthScore(recentMetrics, handoffs);

  return {
    bot: {
      id: String(bot._id),
      name: bot.name,
      llmProvider: bot.custom_llm_provider || 'default-gemini',
      model: bot.custom_model || 'gemini-3.1-pro-preview',
    },
    phoenix: {
      projectName: process.env.PHOENIX_PROJECT_NAME || 'tasteAI-Studio',
      tracingEnabled:
        process.env.PHOENIX_ENABLED === 'true' ||
        Boolean(process.env.PHOENIX_API_KEY),
      mcpServer: 'phoenix',
      mcpConfig: buildPhoenixMcpConfig(),
    },
    metrics: {
      totalQa,
      sampledSessions: sessions.length,
      sampledSessionMessages: sessionQa.length,
      averageConfidence,
      lowConfidenceCount: lowConfidenceQuestions.length,
      sourceBreakdown,
    },
    healthScore,
    lowConfidenceQuestions,
    recommendations: buildRecommendations({
      lowConfidenceQuestions,
      sourceBreakdown,
      totalQa,
      healthScore,
    }),
    selfImprovementLoop: [
      'Trace every bot answer into Phoenix with bot, session, source, score, and prompt attributes.',
      'Use Phoenix MCP to pull recent low-confidence traces and create a dataset.',
      'Run LLM-as-a-judge evals for relevance, groundedness, tone, and handoff correctness.',
      'Promote winning prompt or training-data changes only after experiment scores improve.',
    ],
  };
};

exports.getBotSelfImprovementDashboard = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const [metrics, handoffs] = await loadHealthInputs(botId);

  const weakAnswers = metrics
    .filter(
      (metric) =>
        typeof metric.confidence !== 'number' || metric.confidence < 0.85
    )
    .slice(0, 20)
    .map((metric) =>
      buildImprovementItem('weak_answer', metric, {
        priority:
          typeof metric.confidence === 'number' && metric.confidence < 0.65
            ? 'high'
            : 'medium',
        title: 'Weak answer confidence',
        description: 'The bot answered with low retrieval confidence.',
      })
    );

  const unanswered = metrics
    .filter((metric) => metric.usedFallback || metric.source === 'none')
    .slice(0, 20)
    .map((metric) =>
      buildImprovementItem('unanswered_question', metric, {
        priority: 'high',
        title: 'Unanswered or fallback response',
        description: 'The bot could not confidently answer this user question.',
      })
    );

  const hallucinationRisk = metrics
    .filter((metric) => (metric.hallucinationRisk || 0) >= 0.45)
    .slice(0, 20)
    .map((metric) =>
      buildImprovementItem('hallucination_risk', metric, {
        priority: (metric.hallucinationRisk || 0) >= 0.7 ? 'high' : 'medium',
        title: 'Hallucination or grounding risk',
        description:
          'The answer may need grounding, citation, or better training data.',
      })
    );

  const intentCounts = metrics.reduce((acc, metric) => {
    const normalized = normalizeKey(metric.question).split('-').slice(0, 6).join('-');
    if (!normalized) return acc;
    if (!acc[normalized]) {
      acc[normalized] = { count: 0, metric };
    }
    acc[normalized].count += 1;
    return acc;
  }, {});

  const repeatedIntents = Object.values(intentCounts)
    .filter((entry) => entry.count >= 2)
    .slice(0, 10)
    .map((entry) =>
      buildImprovementItem('repeated_unknown_intent', entry.metric, {
        priority: 'medium',
        title: `Repeated intent detected (${entry.count}x)`,
        description:
          'Similar user questions are appearing repeatedly. Consider adding a dedicated training answer or workflow path.',
      })
    );

  const handoffItems = handoffs
    .filter((handoff) => handoff.escalated || handoff.status !== 'resolved')
    .slice(0, 15)
    .map((handoff) =>
      buildImprovementItem(
        'low_confidence_session',
        {
          _id: handoff._id,
          flowSession: handoff.flowSession,
          question:
            handoff.userQuestion ||
            handoff.messages?.[0]?.message ||
            'Handoff session',
          answer: handoff.agentNotes || '',
          source: 'handoff',
          confidence: null,
          hallucinationRisk: handoff.escalated ? 0.7 : 0.5,
          createdAt: handoff.requestedAt || handoff.createdAt,
        },
        {
          priority: handoff.escalated ? 'high' : 'medium',
          title: handoff.escalated
            ? 'Escalated handoff session'
            : 'Unresolved handoff session',
          description:
            'This session needed human attention. Review whether the bot should answer, clarify, or hand off earlier.',
        }
      )
    );

  const combined = [
    ...unanswered,
    ...weakAnswers,
    ...hallucinationRisk,
    ...repeatedIntents,
    ...handoffItems,
  ];

  const deduped = Array.from(
    new Map(combined.map((item) => [item.key, item])).values()
  ).sort((a, b) => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    return priorityRank[a.priority] - priorityRank[b.priority];
  });

  const actions = await BotImprovementAction.find({
    bot: botId,
    itemKey: { $in: deduped.map((item) => item.key) },
  }).lean();

  const items = mergeActionState(deduped, actions);

  return {
    bot: {
      id: String(bot._id),
      name: bot.name,
    },
    summary: {
      totalItems: items.length,
      highPriority: items.filter((item) => item.priority === 'high').length,
      weakAnswers: weakAnswers.length,
      unanswered: unanswered.length,
      hallucinationRisk: hallucinationRisk.length,
      repeatedIntents: repeatedIntents.length,
      handoffReview: handoffItems.length,
    },
    healthScore: buildBotHealthScore(metrics, handoffs),
    items,
  };
};

exports.applyImprovementAction = async ({
  botId,
  userId,
  itemKey,
  action,
  item,
}) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    throw new Error('Bot not found');
  }

  const allowedActions = [
    'add_to_eval_dataset',
    'create_training_qa',
    'mark_expected',
    'send_to_human_review',
  ];

  if (!allowedActions.includes(action)) {
    throw new Error('Invalid improvement action');
  }

  let status = 'queued';
  const payload = { item: item || null };

  if (action === 'mark_expected') {
    status = 'completed';
    payload.expected = true;
  }

  if (action === 'add_to_eval_dataset') {
    if (!item?.question) {
      throw new Error('Question is required to add an eval dataset item');
    }

    const datasetItem = await BotEvalDatasetItem.findOneAndUpdate(
      { bot: botId, itemKey },
      {
        bot: botId,
        itemKey,
        datasetName: 'Self Improvement',
        sourceType: 'self_improvement',
        question: item.question,
        expectedAnswer: '',
        actualAnswer: item.answer || '',
        source: item.type || 'self_improvement',
        metadata: {
          confidence: item.confidence,
          hallucinationRisk: item.hallucinationRisk,
          sessionId: item.sessionId,
          source: item.source,
        },
        createdBy: userId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    status = 'completed';
    payload.evalDatasetItemId = datasetItem._id;
  }

  if (action === 'create_training_qa') {
    if (!item?.question || !item?.answer) {
      throw new Error('Question and answer are required to create training Q&A');
    }

    const embedding = await generateEmbedding(item.question, bot);
    await QAHistory.create({
      bot: botId,
      question: item.question,
      answer: item.answer,
      embedding: Buffer.from(embedding.buffer),
      source: 'improvement',
    });
    status = 'completed';
  }

  if (action === 'send_to_human_review') {
    if (!item?.question) {
      throw new Error('Question is required to send this item to human review');
    }

    const reviewQuestion = [
      'Self-improvement review requested.',
      `Issue type: ${item.type || 'unknown'}`,
      `Priority: ${item.priority || 'medium'}`,
      `Question: ${item.question}`,
      item.answer ? `Bot answer: ${item.answer}` : null,
      item.confidence !== null && item.confidence !== undefined
        ? `Confidence: ${Math.round(item.confidence * 100)}%`
        : null,
      item.hallucinationRisk !== null && item.hallucinationRisk !== undefined
        ? `Hallucination risk: ${Math.round(item.hallucinationRisk * 100)}%`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    let flowSessionId = item.sessionId;
    if (!flowSessionId) {
      const flowSession = await FlowSession.create({
        bot: botId,
        currentMode: 'idle',
        history: [
          {
            mode: 'qa',
            type: 'self_improvement_review',
            question: item.question,
            answer: item.answer || '',
            timestamp: new Date(),
            fromUser: true,
          },
        ],
      });
      flowSessionId = flowSession._id;
    }

    const handoffResult = await humanHandoffService.requestHumanHandoff({
      botId,
      flowSessionId,
      userQuestion: reviewQuestion,
      userIpAddress: '',
      userAgent: 'TasteAI Self-Improvement Dashboard',
    });

    if (handoffResult.alreadyExists && handoffResult.handoffSession?._id) {
      await humanHandoffService.addMessageToSession(
        handoffResult.handoffSession._id,
        'user',
        reviewQuestion,
        null
      );
    }

    status = 'needs_review';
    payload.flowSessionId = flowSessionId;
    payload.handoffSessionId = handoffResult.handoffSession?._id;
    payload.handoffAlreadyExists = !!handoffResult.alreadyExists;
  }

  const record = await BotImprovementAction.create({
    bot: botId,
    itemKey,
    action,
    status,
    payload,
    performedBy: userId,
  });

  return {
    action: record.action,
    status: record.status,
    payload: record.payload,
  };
};

exports.buildEvalDatasetFromProduction = async ({ botId, userId, sourceType }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const validSources = [
    'low_confidence_traces',
    'handoff_sessions',
    'negative_feedback',
    'unanswered_questions',
  ];

  if (!validSources.includes(sourceType)) {
    throw new Error('Invalid dataset source type');
  }

  let records = [];

  if (sourceType === 'low_confidence_traces') {
    const metrics = await BotInteractionMetric.find({
      bot: botId,
      $or: [{ confidence: { $lt: 0.85 } }, { confidence: null }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    records = metrics.map((metric) =>
      buildDatasetRecord({
        botId,
        sourceType,
        itemKey: `${sourceType}:${metric._id}`,
        question: metric.question || 'Untitled question',
        answer: metric.answer || '',
        userId,
        metadata: {
          confidence: metric.confidence,
          latencyMs: metric.latencyMs,
          flowSession: metric.flowSession,
          source: metric.source,
        },
      })
    );
  }

  if (sourceType === 'unanswered_questions') {
    const metrics = await BotInteractionMetric.find({
      bot: botId,
      $or: [{ usedFallback: true }, { source: 'none' }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    records = metrics.map((metric) =>
      buildDatasetRecord({
        botId,
        sourceType,
        itemKey: `${sourceType}:${metric._id}`,
        question: metric.question || 'Untitled question',
        answer: metric.answer || '',
        userId,
        metadata: {
          confidence: metric.confidence,
          usedFallback: metric.usedFallback,
          flowSession: metric.flowSession,
        },
      })
    );
  }

  if (sourceType === 'handoff_sessions') {
    const handoffs = await HandoffSession.find({ bot: botId })
      .sort({ requestedAt: -1 })
      .limit(100)
      .lean();

    records = handoffs.map((handoff) =>
      buildDatasetRecord({
        botId,
        sourceType,
        itemKey: `${sourceType}:${handoff._id}`,
        question:
          handoff.userQuestion ||
          handoff.messages?.find((message) => message.sender === 'user')?.message ||
          'Human handoff session',
        answer: handoff.agentNotes || '',
        userId,
        metadata: {
          handoffSession: handoff._id,
          status: handoff.status,
          escalated: handoff.escalated,
          userRating: handoff.userRating,
        },
      })
    );
  }

  if (sourceType === 'negative_feedback') {
    const handoffs = await HandoffSession.find({
      bot: botId,
      $or: [
        { userRating: { $lte: 2 } },
        { userFeedback: { $exists: true, $ne: '' } },
      ],
    })
      .sort({ requestedAt: -1 })
      .limit(100)
      .lean();

    records = handoffs.map((handoff) =>
      buildDatasetRecord({
        botId,
        sourceType,
        itemKey: `${sourceType}:${handoff._id}`,
        question:
          handoff.userQuestion ||
          handoff.messages?.find((message) => message.sender === 'user')?.message ||
          'Negative feedback session',
        answer: handoff.agentNotes || handoff.userFeedback || '',
        userId,
        metadata: {
          handoffSession: handoff._id,
          userRating: handoff.userRating,
          userFeedback: handoff.userFeedback,
          status: handoff.status,
        },
      })
    );
  }

  const saved = await upsertDatasetItems(
    records.filter((record) => record.question && record.question.trim())
  );

  return {
    sourceType,
    datasetName: datasetNameForSource(sourceType),
    createdCount: saved.length,
    items: saved,
  };
};

exports.getEvalDatasets = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const [items, runs] = await Promise.all([
    BotEvalDatasetItem.find({ bot: botId }).sort({ createdAt: -1 }).limit(300).lean(),
    BotEvalRun.find({ bot: botId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const datasets = Object.values(
    items.reduce((acc, item) => {
      const key = item.datasetName || 'Default Eval Dataset';
      if (!acc[key]) {
        acc[key] = {
          datasetName: key,
          sourceTypes: new Set(),
          itemCount: 0,
          latestItemAt: item.createdAt,
        };
      }
      acc[key].itemCount += 1;
      acc[key].sourceTypes.add(item.sourceType || item.source);
      if (new Date(item.createdAt) > new Date(acc[key].latestItemAt)) {
        acc[key].latestItemAt = item.createdAt;
      }
      return acc;
    }, {})
  ).map((dataset) => ({
    ...dataset,
    sourceTypes: Array.from(dataset.sourceTypes),
  }));

  return {
    datasets,
    items,
    runs,
  };
};

exports.runLLMJudgeForBot = async ({ botId, userId, datasetName }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const query = { bot: botId };
  if (datasetName && datasetName !== 'all') {
    query.datasetName = datasetName;
  }

  const items = await BotEvalDatasetItem.find(query)
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  if (!items.length) {
    throw new Error('No eval dataset items found for this bot');
  }

  const run = await BotEvalRun.create({
    bot: botId,
    datasetName: datasetName || 'all',
    status: 'running',
    judgeModel: bot.custom_model || 'gemini-3.1-pro-preview',
  });

  try {
    const llmClient = await getLLMClient(bot, userId);
    const explanations = [];

    for (const item of items) {
      const prompt = `
You are an LLM-as-a-Judge evaluator for a production chatbot.

Bot persona:
- Name: ${bot.name || 'Bot'}
- Description: ${bot.description || 'Not provided'}
- Tone: ${bot.conversation_tone || 'Professional'}
- Response style: ${bot.response_style || 'Helpful'}
- Custom instructions: ${bot.custom_instructions || 'None'}
- Human handoff enabled: ${bot.human_handoff_enabled ? 'yes' : 'no'}

Evaluate the actual bot answer against the user question and any expected answer.

User question:
${item.question}

Actual bot answer:
${item.actualAnswer || '(empty)'}

Expected answer or reviewer note:
${item.expectedAnswer || '(not provided)'}

Return only JSON:
{
  "scores": {
    "relevance": 0-1,
    "helpfulness": 0-1,
    "groundedness": 0-1,
    "toneMatch": 0-1,
    "instructionFollowing": 0-1,
    "handoffCorrectness": 0-1,
    "refusalCorrectness": 0-1,
    "responseLengthFit": 0-1
  },
  "explanation": "short practical explanation"
}`;

      const raw = await llmClient.generateSummary(prompt);
      const parsed = parseJudgeJson(raw) || {};
      const scores = parsed.scores || {};
      const normalizedScores = {
        relevance: normalizeJudgeScore(scores.relevance),
        helpfulness: normalizeJudgeScore(scores.helpfulness),
        groundedness: normalizeJudgeScore(scores.groundedness),
        toneMatch: normalizeJudgeScore(scores.toneMatch),
        instructionFollowing: normalizeJudgeScore(scores.instructionFollowing),
        handoffCorrectness: normalizeJudgeScore(scores.handoffCorrectness),
        refusalCorrectness: normalizeJudgeScore(scores.refusalCorrectness),
        responseLengthFit: normalizeJudgeScore(scores.responseLengthFit),
      };

      explanations.push({
        itemId: item._id,
        question: item.question,
        scores: normalizedScores,
        explanation: parsed.explanation || 'Judge completed without explanation.',
      });
    }

    const criteria = Object.keys(explanations[0].scores).reduce((acc, key) => {
      acc[key] =
        explanations.reduce((sum, item) => sum + item.scores[key], 0) /
        explanations.length;
      return acc;
    }, {});

    const overallScore =
      Object.values(criteria).reduce((sum, value) => sum + value, 0) /
      Object.values(criteria).length;

    await BotEvalRun.findByIdAndUpdate(run._id, {
      status: 'completed',
      criteria,
      overallScore,
      explanations,
      completedAt: new Date(),
    });

    return BotEvalRun.findById(run._id).lean();
  } catch (error) {
    await BotEvalRun.findByIdAndUpdate(run._id, {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
    });
    throw error;
  }
};
