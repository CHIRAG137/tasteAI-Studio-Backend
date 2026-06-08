const ChatBot = require('../models/ChatBot');
const User = require('../models/User');
const FlowSession = require('../models/FlowSession');
const QAHistory = require('../models/QAHistory');
const HandoffSession = require('../models/HandoffSession');
const BotEvalDatasetItem = require('../models/BotEvalDatasetItem');
const BotEvalDatasetType = require('../models/BotEvalDatasetType');
const BotEvalRun = require('../models/BotEvalRun');
const BotExperiment = require('../models/BotExperiment');
const BotInteractionMetric = require('../models/BotInteractionMetric');
const BotImprovementAction = require('../models/BotImprovementAction');
const BotAutopilotConfig = require('../models/BotAutopilotConfig');
const BotAutopilotRun = require('../models/BotAutopilotRun');
const SlackIntegration = require('../models/SlackIntegration');
const humanHandoffService = require('./humanHandoffService');
const { generateEmbedding, getLLMClient } = require('../utils/llmClientUtils');
const { buildPhoenixMcpConfig, getPhoenixRuntimeInfo, runPhoenixSpan, setPhoenixSpanAttributes } = require('../config/phoenixTracing');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sendEmail = require('../utils/sendEmailUtil');
const slackClient = require('../config/slackClient');

const DEFAULT_INTROSPECTION_QUESTIONS = [
  'Why did my bot fail yesterday?',
  'What questions are users asking that I cannot answer?',
  'Which prompt version performed best?',
  'What should I add to training data?',
];

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

const SOURCE_TYPE_POLARITY = {
  low_confidence_traces: 'negative',
  high_confidence_traces: 'positive',
  handoff_sessions: 'negative',
  resolved_handoffs: 'positive',
  negative_feedback: 'negative',
  positive_feedback: 'positive',
  unanswered_questions: 'negative',
  grounded_answers: 'positive',
  hallucination_risk: 'negative',
  qa_retrieval_hits: 'positive',
  slow_responses: 'negative',
  self_improvement: 'neutral',
  custom: 'neutral',
};

const JUDGE_CRITERIA = {
  relevance: {
    key: 'relevance',
    label: 'Relevance',
    description: 'Does the answer directly address the user question?',
  },
  helpfulness: {
    key: 'helpfulness',
    label: 'Helpfulness',
    description: 'Is the answer useful and actionable for the user?',
  },
  groundedness: {
    key: 'groundedness',
    label: 'Groundedness',
    description: 'Is the answer supported by training data or known facts?',
  },
  toneMatch: {
    key: 'toneMatch',
    label: 'Tone match',
    description: 'Does the tone match the bot persona and conversation style?',
  },
  instructionFollowing: {
    key: 'instructionFollowing',
    label: 'Instruction following',
    description: 'Does the answer follow custom bot instructions and policies?',
  },
  handoffCorrectness: {
    key: 'handoffCorrectness',
    label: 'Handoff correctness',
    description: 'Was escalation or human handoff handled appropriately?',
  },
  refusalCorrectness: {
    key: 'refusalCorrectness',
    label: 'Refusal correctness',
    description: 'When the bot cannot answer, does it refuse or clarify correctly?',
  },
  responseLengthFit: {
    key: 'responseLengthFit',
    label: 'Response length',
    description: 'Is the answer concise without being too short or verbose?',
  },
};

const EVAL_MODE_CRITERIA = {
  standard: Object.keys(JUDGE_CRITERIA),
  regression: [
    'relevance',
    'groundedness',
    'refusalCorrectness',
    'handoffCorrectness',
    'helpfulness',
  ],
  gold_standard: [
    'relevance',
    'helpfulness',
    'groundedness',
    'toneMatch',
    'instructionFollowing',
    'responseLengthFit',
  ],
};

const BUILTIN_EVAL_SOURCE_TYPES = [
  'low_confidence_traces',
  'high_confidence_traces',
  'handoff_sessions',
  'resolved_handoffs',
  'negative_feedback',
  'positive_feedback',
  'unanswered_questions',
  'grounded_answers',
  'hallucination_risk',
  'qa_retrieval_hits',
  'slow_responses',
];

function datasetNameForSource(sourceType, customName) {
  if (customName) return customName;
  const names = {
    low_confidence_traces: 'Low Confidence Traces',
    high_confidence_traces: 'High Confidence Traces',
    handoff_sessions: 'Handoff Sessions',
    resolved_handoffs: 'Resolved Handoffs',
    negative_feedback: 'Negative Feedback',
    positive_feedback: 'Positive Feedback',
    unanswered_questions: 'Unanswered Questions',
    grounded_answers: 'Grounded Answers',
    hallucination_risk: 'Hallucination Risk',
    qa_retrieval_hits: 'QA Retrieval Hits',
    slow_responses: 'Slow Responses',
    custom: 'Custom Eval Dataset',
  };
  return names[sourceType] || 'Production Conversations';
}

function buildDatasetRecord({
  botId,
  sourceType,
  itemKey,
  question,
  answer,
  metadata,
  userId,
  datasetName,
  customTypeId,
}) {
  return {
    bot: botId,
    itemKey,
    datasetName: datasetName || datasetNameForSource(sourceType),
    sourceType,
    customTypeId: customTypeId || null,
    question,
    expectedAnswer: '',
    actualAnswer: answer || '',
    source: sourceType,
    metadata: metadata || {},
    createdBy: userId,
  };
}

function metricToDatasetRecord({
  botId,
  sourceType,
  metric,
  userId,
  datasetName,
  customTypeId,
}) {
  const itemKey = customTypeId
    ? `custom:${customTypeId}:${metric._id}`
    : `${sourceType}:${metric._id}`;

  return buildDatasetRecord({
    botId,
    sourceType,
    itemKey,
    question: metric.question || 'Untitled question',
    answer: metric.answer || '',
    userId,
    datasetName,
    customTypeId,
    metadata: {
      confidence: metric.confidence,
      latencyMs: metric.latencyMs,
      flowSession: metric.flowSession,
      source: metric.source,
      groundednessScore: metric.groundednessScore,
      hallucinationRisk: metric.hallucinationRisk,
      usedFallback: metric.usedFallback,
      retrievalScore: metric.trace?.retrieval?.retrievalScore,
      traceUrl: metric.phoenix?.traceUrl,
    },
  });
}

function handoffToDatasetRecord({
  botId,
  sourceType,
  handoff,
  userId,
  datasetName,
  customTypeId,
}) {
  const itemKey = customTypeId
    ? `custom:${customTypeId}:${handoff._id}`
    : `${sourceType}:${handoff._id}`;

  return buildDatasetRecord({
    botId,
    sourceType,
    itemKey,
    question:
      handoff.userQuestion ||
      handoff.messages?.find((message) => message.sender === 'user')?.message ||
      'Handoff session',
    answer: handoff.agentNotes || handoff.userFeedback || '',
    userId,
    datasetName,
    customTypeId,
    metadata: {
      handoffSession: handoff._id,
      status: handoff.status,
      escalated: handoff.escalated,
      userRating: handoff.userRating,
      userFeedback: handoff.userFeedback,
    },
  });
}

function buildMetricQueryFromFilters(botId, filters = {}) {
  const query = { bot: botId };

  if (typeof filters.confidenceMin === 'number') {
    query.confidence = { ...(query.confidence || {}), $gte: filters.confidenceMin };
  }
  if (typeof filters.confidenceMax === 'number') {
    query.confidence = { ...(query.confidence || {}), $lte: filters.confidenceMax };
  }
  if (typeof filters.hallucinationRiskMin === 'number') {
    query.hallucinationRisk = {
      ...(query.hallucinationRisk || {}),
      $gte: filters.hallucinationRiskMin,
    };
  }
  if (typeof filters.hallucinationRiskMax === 'number') {
    query.hallucinationRisk = {
      ...(query.hallucinationRisk || {}),
      $lte: filters.hallucinationRiskMax,
    };
  }
  if (typeof filters.groundednessScoreMin === 'number') {
    query.groundednessScore = {
      ...(query.groundednessScore || {}),
      $gte: filters.groundednessScoreMin,
    };
  }
  if (typeof filters.groundednessScoreMax === 'number') {
    query.groundednessScore = {
      ...(query.groundednessScore || {}),
      $lte: filters.groundednessScoreMax,
    };
  }
  if (typeof filters.usedFallback === 'boolean') {
    query.usedFallback = filters.usedFallback;
  }
  if (Array.isArray(filters.sources) && filters.sources.length) {
    query.source = { $in: filters.sources };
  }
  if (Array.isArray(filters.userEmotions) && filters.userEmotions.length) {
    query.userEmotion = { $in: filters.userEmotions };
  }
  if (typeof filters.latencyMsMin === 'number') {
    query.latencyMs = { ...(query.latencyMs || {}), $gte: filters.latencyMsMin };
  }
  if (typeof filters.latencyMsMax === 'number') {
    query.latencyMs = { ...(query.latencyMs || {}), $lte: filters.latencyMsMax };
  }
  if (typeof filters.retrievalScoreMin === 'number') {
    query['trace.retrieval.retrievalScore'] = { $gte: filters.retrievalScoreMin };
  }

  return query;
}

function buildHandoffQueryFromFilters(botId, filters = {}) {
  const query = { bot: botId };

  if (Array.isArray(filters.statuses) && filters.statuses.length) {
    query.status = { $in: filters.statuses };
  }
  if (typeof filters.escalated === 'boolean') {
    query.escalated = filters.escalated;
  }
  if (typeof filters.userRatingMin === 'number') {
    query.userRating = { ...(query.userRating || {}), $gte: filters.userRatingMin };
  }
  if (typeof filters.userRatingMax === 'number') {
    query.userRating = { ...(query.userRating || {}), $lte: filters.userRatingMax };
  }
  if (filters.hasFeedback === true) {
    query.userFeedback = { $exists: true, $ne: '' };
  }
  if (filters.hasFeedback === false) {
    query.$or = [
      { userFeedback: { $exists: false } },
      { userFeedback: '' },
      { userFeedback: null },
    ];
  }

  return query;
}

async function fetchMetricsForBuiltinSource(botId, sourceType) {
  const baseQuery = { bot: botId };
  let query = baseQuery;

  switch (sourceType) {
    case 'low_confidence_traces':
      query = {
        ...baseQuery,
        $or: [{ confidence: { $lt: 0.85 } }, { confidence: null }],
      };
      break;
    case 'high_confidence_traces':
      query = {
        ...baseQuery,
        confidence: { $gte: 0.9 },
        usedFallback: { $ne: true },
        source: { $ne: 'none' },
      };
      break;
    case 'unanswered_questions':
      query = {
        ...baseQuery,
        $or: [{ usedFallback: true }, { source: 'none' }],
      };
      break;
    case 'grounded_answers':
      query = {
        ...baseQuery,
        confidence: { $gte: 0.85 },
        $or: [
          { groundednessScore: { $gte: 0.8 } },
          { hallucinationRisk: { $lte: 0.2 } },
        ],
      };
      break;
    case 'hallucination_risk':
      query = {
        ...baseQuery,
        hallucinationRisk: { $gte: 0.45 },
      };
      break;
    case 'qa_retrieval_hits':
      query = {
        ...baseQuery,
        source: { $in: ['qa', 'dataset'] },
        'trace.retrieval.retrievalScore': { $gte: 0.85 },
      };
      break;
    case 'slow_responses':
      query = {
        ...baseQuery,
        latencyMs: { $gte: 5000 },
      };
      break;
    default:
      return [];
  }

  return BotInteractionMetric.find(query).sort({ createdAt: -1 }).limit(100).lean();
}

async function fetchHandoffsForBuiltinSource(botId, sourceType) {
  let query = { bot: botId };

  switch (sourceType) {
    case 'handoff_sessions':
      break;
    case 'resolved_handoffs':
      query = { ...query, status: 'resolved', escalated: { $ne: true } };
      break;
    case 'negative_feedback':
      query = {
        ...query,
        $or: [
          { userRating: { $lte: 2 } },
          { userFeedback: { $exists: true, $ne: '' } },
        ],
      };
      break;
    case 'positive_feedback':
      query = { ...query, userRating: { $gte: 4 } };
      break;
    default:
      return [];
  }

  return HandoffSession.find(query).sort({ requestedAt: -1 }).limit(100).lean();
}

function inferDatasetPolarity(sourceTypes = [], customTypes = [], datasetName = '') {
  const customMatch = customTypes.find(
    (type) => type.datasetName === datasetName || type.name === datasetName
  );
  if (customMatch?.polarity) {
    return customMatch.polarity;
  }

  const polarities = (sourceTypes || [])
    .map((type) => SOURCE_TYPE_POLARITY[type])
    .filter(Boolean);

  if (!polarities.length) return 'neutral';
  const unique = [...new Set(polarities)];
  if (unique.length > 1) return 'mixed';
  return unique[0];
}

function datasetDescriptionFor(sourceTypes = [], customTypes = [], datasetName = '') {
  const customMatch = customTypes.find(
    (type) => type.datasetName === datasetName || type.name === datasetName
  );
  if (customMatch?.description) {
    return customMatch.description;
  }

  const primarySource = sourceTypes?.[0];
  if (!primarySource) return 'Production conversation samples for evaluation.';
  return `Built from ${primarySource.replace(/_/g, ' ')} traces.`;
}

function resolveJudgeCriteria({ evalMode = 'standard', selectedCriteria = [] }) {
  if (evalMode === 'custom' && Array.isArray(selectedCriteria) && selectedCriteria.length) {
    return selectedCriteria.filter((key) => JUDGE_CRITERIA[key]);
  }
  return EVAL_MODE_CRITERIA[evalMode] || EVAL_MODE_CRITERIA.standard;
}

function buildJudgePrompt({ bot, item, evalMode, polarity, activeCriteria }) {
  const criteriaLines = activeCriteria
    .map((key) => `- ${JUDGE_CRITERIA[key].label}: ${JUDGE_CRITERIA[key].description}`)
    .join('\n');

  const modeGuidance = {
    regression:
      'This is a REGRESSION dataset built from production failure signals. Grade whether the actual answer shows the failure pattern (low confidence, fallback, grounding risk, etc.). Low scores confirm the item belongs in this dataset.',
    gold_standard:
      'This is a GOLD STANDARD dataset built from high-quality production answers. Grade whether the answer is exemplary and should be preserved as expected behavior.',
    standard:
      'Grade the answer holistically against the bot persona and user intent.',
    custom:
      'Grade the answer using only the selected criteria below.',
  };

  const polarityGuidance = {
    negative:
      'Dataset polarity: negative/regression. Prioritize detecting weak, ungrounded, or incorrect answers.',
    positive:
      'Dataset polarity: positive/gold standard. Prioritize confirming answer quality, tone, and completeness.',
    neutral: 'Dataset polarity: neutral. Apply balanced grading.',
    mixed: 'Dataset polarity: mixed. Apply balanced grading across heterogeneous traces.',
  };

  const scoreTemplate = activeCriteria.reduce((acc, key) => {
    acc[key] = '0-1';
    return acc;
  }, {});

  return `
You are an LLM-as-a-Judge evaluator for a production chatbot.

Bot persona:
- Name: ${bot.name || 'Bot'}
- Description: ${bot.description || 'Not provided'}
- Tone: ${bot.conversation_tone || 'Professional'}
- Response style: ${bot.response_style || 'Helpful'}
- Custom instructions: ${bot.custom_instructions || 'None'}
- Human handoff enabled: ${bot.human_handoff_enabled ? 'yes' : 'no'}

Evaluation mode: ${evalMode}
${modeGuidance[evalMode] || modeGuidance.standard}
${polarityGuidance[polarity] || polarityGuidance.neutral}

Score only these criteria:
${criteriaLines}

Dataset source type: ${item.sourceType || item.source || 'unknown'}
Trace metadata: ${JSON.stringify(item.metadata || {})}

User question:
${item.question}

Actual bot answer:
${item.actualAnswer || '(empty)'}

Expected answer or reviewer note:
${item.expectedAnswer || '(not provided)'}

Return only JSON:
{
  "scores": ${JSON.stringify(scoreTemplate)},
  "explanation": "short practical explanation referencing the criteria"
}`;
}

function averageItemScore(scores, activeCriteria) {
  const values = activeCriteria
    .map((key) => scores[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function itemVerdict({ overallItemScore, passThreshold, polarity }) {
  if (typeof overallItemScore !== 'number') return 'review';
  if (polarity === 'negative') {
    return overallItemScore < passThreshold ? 'pass' : 'fail';
  }
  if (polarity === 'positive') {
    return overallItemScore >= passThreshold ? 'pass' : 'fail';
  }
  return overallItemScore >= passThreshold ? 'pass' : 'fail';
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

function averageNumbers(values) {
  const clean = values.filter(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function estimateCostFromText(...parts) {
  const characters = parts.join('').length;
  const estimatedTokens = Math.ceil(characters / 4);
  return Number((estimatedTokens * 0.0000005).toFixed(6));
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

async function generateVariantAnswer({ bot, variant, item, userId }) {
  const config = variant.config || {};
  const prompt = `
You are running an experiment for chatbot "${bot.name || 'Bot'}".

Bot description:
${bot.description || 'Not provided'}

Base bot instructions:
${bot.custom_instructions || 'None'}

Variant label:
${variant.label}

Variant description:
${variant.description || 'No description provided'}

Variant JSON config:
${JSON.stringify(config, null, 2)}

Interpret the variant JSON config as product-controlled bot configuration.
Common keys may include model, promptInstructions, responseStyle, retrievalThreshold,
handoffPolicy, refusalPolicy, tone, maxAnswerLength, knowledgeStrategy, or any custom
runtime keys. Apply only what is present in the config and keep behavior aligned with
the bot persona.

User question:
${item.question}

Available expected/reviewer context:
${item.expectedAnswer || item.actualAnswer || 'No extra context available'}

Answer as the bot.`;

  const startedAt = Date.now();
  let output;

  if (config.model && String(config.model).toLowerCase().startsWith('gemini')) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.generateContent(prompt);
    output = result.response.text();
  } else {
    const llmClient = await getLLMClient(bot, userId);
    output = await llmClient.generateSummary(prompt);
  }

  return {
    output,
    latencyMs: Date.now() - startedAt,
    estimatedCost: estimateCostFromText(prompt, output || ''),
  };
}

async function judgeExperimentSample({ bot, item, controlOutput, treatmentOutput, userId }) {
  const judgePrompt = `
You are judging an A/B experiment for a production chatbot.

Bot:
- Name: ${bot.name || 'Bot'}
- Description: ${bot.description || 'Not provided'}
- Tone: ${bot.conversation_tone || 'Professional'}
- Response style: ${bot.response_style || 'Helpful'}

User question:
${item.question}

Expected/reviewer context:
${item.expectedAnswer || item.actualAnswer || 'None'}

Control answer:
${controlOutput}

Treatment answer:
${treatmentOutput}

Score both answers from 0 to 1 for relevance, helpfulness, groundedness, tone match, instruction following, refusal correctness, handoff correctness, and response length fit.
Pick a winner: "control", "treatment", or "tie".

Return only JSON:
{
  "winner": "control|treatment|tie",
  "controlScore": 0-1,
  "treatmentScore": 0-1,
  "explanation": "short explanation"
}`;

  const llmClient = await getLLMClient(bot, userId);
  const raw = await llmClient.generateSummary(judgePrompt);
  const parsed = parseJudgeJson(raw) || {};

  return {
    winner: ['control', 'treatment', 'tie'].includes(parsed.winner)
      ? parsed.winner
      : 'tie',
    controlScore: normalizeJudgeScore(parsed.controlScore),
    treatmentScore: normalizeJudgeScore(parsed.treatmentScore),
    explanation: parsed.explanation || 'Judge completed without explanation.',
  };
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

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildFailureClusters(metrics) {
  const buckets = {};

  for (const metric of metrics) {
    const key = normalizeKey(metric.question).split('-').slice(0, 5).join('-');
    if (!key) continue;
    if (!buckets[key]) {
      buckets[key] = {
        intentKey: key,
        count: 0,
        examples: [],
        avgConfidence: null,
        avgLatencyMs: null,
        fallbackCount: 0,
      };
    }
    buckets[key].count += 1;
    buckets[key].examples.push({
      question: metric.question,
      answer: metric.answer,
      source: metric.source,
      confidence: metric.confidence,
      traceUrl: metric.phoenix?.traceUrl || null,
      createdAt: metric.createdAt,
    });
    if (metric.usedFallback || metric.source === 'none') {
      buckets[key].fallbackCount += 1;
    }
  }

  return Object.values(buckets)
    .map((bucket) => ({
      ...bucket,
      examples: bucket.examples.slice(0, 3),
      avgConfidence: average(bucket.examples.map((item) => item.confidence)),
      avgLatencyMs: average(
        metrics
          .filter((metric) => normalizeKey(metric.question).startsWith(bucket.intentKey))
          .map((metric) => metric.latencyMs)
      ),
    }))
    .sort((a, b) => {
      const aScore = a.fallbackCount * 2 + a.count + (a.avgConfidence === null ? 1 : 1 - a.avgConfidence);
      const bScore = b.fallbackCount * 2 + b.count + (b.avgConfidence === null ? 1 : 1 - b.avgConfidence);
      return bScore - aScore;
    })
    .slice(0, 8);
}

function buildIntrospectionEvidence({ bot, metrics, handoffs, evalRuns, experiments }) {
  const lowConfidence = metrics.filter(
    (metric) => typeof metric.confidence !== 'number' || metric.confidence < 0.85
  );
  const unanswered = metrics.filter(
    (metric) => metric.usedFallback || metric.source === 'none'
  );
  const linkedPhoenixTraces = metrics.filter((metric) => metric.phoenix?.traceId);
  const sourceBreakdown = countBy(metrics, (metric) => metric.source);
  const fallbackBreakdown = countBy(unanswered, (metric) => metric.trace?.fallback?.source || metric.source);
  const latestJudgeRun = evalRuns.find((run) => run.status === 'completed') || evalRuns[0] || null;
  const completedExperiments = experiments.filter((experiment) => experiment.status === 'completed');
  const bestExperiment = completedExperiments
    .slice()
    .sort((a, b) => {
      const aScore = a.metrics?.treatmentAverageJudgeScore ?? a.metrics?.treatmentWinRate ?? 0;
      const bScore = b.metrics?.treatmentAverageJudgeScore ?? b.metrics?.treatmentWinRate ?? 0;
      return bScore - aScore;
    })[0] || null;

  return {
    bot: {
      id: String(bot._id),
      name: bot.name,
      model: bot.custom_model || 'gemini-3.1-pro-preview',
      provider: bot.custom_llm_provider || 'default',
      promptStyle: {
        purpose: bot.primary_purpose,
        tone: bot.conversation_tone,
        responseStyle: bot.response_style,
        customInstructions: bot.custom_instructions,
      },
    },
    phoenix: {
      ...getPhoenixRuntimeInfo(),
      mcpConfig: buildPhoenixMcpConfig(),
      linkedTraceCount: linkedPhoenixTraces.length,
      recentTraceUrls: linkedPhoenixTraces
        .slice(0, 8)
        .map((metric) => ({
          traceId: metric.phoenix.traceId,
          spanId: metric.phoenix.spanId,
          traceUrl: metric.phoenix.traceUrl,
          question: metric.question,
          confidence: metric.confidence,
        })),
    },
    metrics: {
      sampledInteractions: metrics.length,
      lowConfidenceCount: lowConfidence.length,
      unansweredCount: unanswered.length,
      fallbackRate: metrics.length ? unanswered.length / metrics.length : 0,
      averageConfidence: average(metrics.map((metric) => metric.confidence)),
      averageLatencyMs: average(metrics.map((metric) => metric.latencyMs)),
      sourceBreakdown,
      fallbackBreakdown,
    },
    failureClusters: buildFailureClusters(lowConfidence.concat(unanswered)),
    topLowConfidenceQuestions: lowConfidence.slice(0, 12).map((metric) => ({
      question: metric.question,
      answer: metric.answer,
      confidence: metric.confidence,
      source: metric.source,
      traceUrl: metric.phoenix?.traceUrl || null,
      createdAt: metric.createdAt,
    })),
    topUnansweredQuestions: unanswered.slice(0, 12).map((metric) => ({
      question: metric.question,
      answer: metric.answer,
      source: metric.source,
      fallbackSource: metric.trace?.fallback?.source || null,
      traceUrl: metric.phoenix?.traceUrl || null,
      createdAt: metric.createdAt,
    })),
    handoffs: {
      sampled: handoffs.length,
      unresolved: handoffs.filter((handoff) => handoff.status !== 'resolved').length,
      escalated: handoffs.filter((handoff) => handoff.escalated || handoff.escalationHistory?.length).length,
      recentQuestions: handoffs.slice(0, 8).map((handoff) => ({
        question:
          handoff.userQuestion ||
          handoff.messages?.find((message) => message.sender === 'user')?.message ||
          'Handoff session',
        status: handoff.status,
        escalated: Boolean(handoff.escalated || handoff.escalationHistory?.length),
        requestedAt: handoff.requestedAt || handoff.createdAt,
      })),
    },
    evals: {
      latestJudgeRun: latestJudgeRun
        ? {
            datasetName: latestJudgeRun.datasetName,
            status: latestJudgeRun.status,
            overallScore: latestJudgeRun.overallScore,
            criteria: latestJudgeRun.criteria,
            explanations: (latestJudgeRun.explanations || []).slice(0, 5),
            completedAt: latestJudgeRun.completedAt,
          }
        : null,
    },
    experiments: {
      completedCount: completedExperiments.length,
      best: bestExperiment
        ? {
            name: bestExperiment.name,
            hypothesis: bestExperiment.hypothesis,
            control: bestExperiment.control,
            treatment: bestExperiment.treatment,
            metrics: bestExperiment.metrics,
            completedAt: bestExperiment.completedAt,
          }
        : null,
      recent: experiments.slice(0, 5).map((experiment) => ({
        name: experiment.name,
        status: experiment.status,
        hypothesis: experiment.hypothesis,
        metrics: experiment.metrics,
      })),
    },
  };
}

function buildIntrospectionFallbackAnswer(question, evidence) {
  const topCluster = evidence.failureClusters[0];
  const unanswered = evidence.topUnansweredQuestions.slice(0, 3);
  const lowConfidence = evidence.topLowConfidenceQuestions.slice(0, 3);
  const bestExperiment = evidence.experiments.best;

  return [
    `I inspected ${evidence.metrics.sampledInteractions} recent production traces for ${evidence.bot.name}.`,
    `The biggest issue is ${evidence.metrics.unansweredCount} unanswered/fallback responses and ${evidence.metrics.lowConfidenceCount} low-confidence answers.`,
    topCluster
      ? `The strongest failing intent cluster is "${topCluster.examples[0]?.question || topCluster.intentKey}", seen ${topCluster.count} time(s).`
      : 'I did not find a repeated failing intent cluster yet.',
    unanswered.length
      ? `Add training coverage for: ${unanswered.map((item) => item.question).join('; ')}.`
      : 'No unanswered examples were found in the sampled traces.',
    lowConfidence.length
      ? `Review low-confidence answers for: ${lowConfidence.map((item) => item.question).join('; ')}.`
      : 'No low-confidence examples were found in the sampled traces.',
    bestExperiment
      ? `Best completed prompt/config experiment appears to be "${bestExperiment.name}" based on its saved treatment metrics.`
      : 'No completed prompt/config experiment is available yet, so I cannot name a best prompt version.',
    `Admin question answered: ${question}`,
  ].join('\n\n');
}

exports.askBotSelfIntrospection = async ({ botId, userId, question }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const adminQuestion = String(question || '').trim();
  if (!adminQuestion) {
    throw new Error('Question is required');
  }

  return runPhoenixSpan(
    'bot.self_introspection',
    'CHAIN',
    {
      'bot.id': String(botId),
      'user.id': userId ? String(userId) : undefined,
      'input.value': adminQuestion,
      'metadata.tool': 'phoenix_mcp_self_introspection',
    },
    async (span) => {
      const [metrics, handoffs, evalRuns, experiments] = await Promise.all([
        BotInteractionMetric.find({ bot: botId })
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        HandoffSession.find({ bot: botId })
          .sort({ requestedAt: -1 })
          .limit(80)
          .lean(),
        BotEvalRun.find({ bot: botId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        BotExperiment.find({ bot: botId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

      const evidence = buildIntrospectionEvidence({
        bot,
        metrics,
        handoffs,
        evalRuns,
        experiments,
      });

      const prompt = `
You are a private MCP self-introspection tool for the bot "${bot.name}".
Your internal instruction is: "Inspect your recent Phoenix traces and identify what you are failing at."

Use only the evidence JSON below. It contains recent production traces, Phoenix trace links,
eval judge results, experiment outcomes, handoffs, and failure clusters.
When Phoenix trace IDs are present, mention that the evidence is Phoenix-linked.
If the admin asks about a time range such as yesterday, infer from timestamps in the evidence.
If the evidence cannot answer something, say exactly what is missing and what to run next.

Admin question:
${adminQuestion}

Evidence JSON:
${JSON.stringify(evidence, null, 2)}

Return a concise, actionable answer with:
1. direct answer
2. evidence from traces/evals/experiments
3. what to add/change next
4. suggested follow-up action, such as creating training Q&A, eval dataset, regression test, or experiment
`;

      let answer;
      try {
        const llmClient = await getLLMClient(bot, userId);
        answer = await llmClient.generateSummary(prompt);
      } catch (error) {
        answer = buildIntrospectionFallbackAnswer(adminQuestion, evidence);
      }

      setPhoenixSpanAttributes(span, {
        'output.value': answer,
        'metadata.sampled_interactions': evidence.metrics.sampledInteractions,
        'metadata.low_confidence_count': evidence.metrics.lowConfidenceCount,
        'metadata.unanswered_count': evidence.metrics.unansweredCount,
        'metadata.phoenix_linked_trace_count': evidence.phoenix.linkedTraceCount,
      });

      return {
        question: adminQuestion,
        answer,
        defaultQuestions: DEFAULT_INTROSPECTION_QUESTIONS,
        evidence: {
          phoenix: evidence.phoenix,
          metrics: evidence.metrics,
          failureClusters: evidence.failureClusters,
          topLowConfidenceQuestions: evidence.topLowConfidenceQuestions,
          topUnansweredQuestions: evidence.topUnansweredQuestions,
          latestJudgeRun: evidence.evals.latestJudgeRun,
          bestExperiment: evidence.experiments.best,
        },
      };
    }
  );
};

function normalizeEmailList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPeriodForCadence(cadence) {
  const to = new Date();
  const days = cadence === 'daily' ? 1 : cadence === 'monthly' ? 30 : 7;
  return {
    from: new Date(to.getTime() - days * 24 * 60 * 60 * 1000),
    to,
    cadence: ['daily', 'weekly', 'monthly'].includes(cadence) ? cadence : 'weekly',
  };
}

function computeNextAutopilotRun(cadence = 'weekly', timeOfDay = '09:00') {
  const [hourRaw, minuteRaw] = String(timeOfDay || '09:00').split(':');
  const hour = Math.max(0, Math.min(23, Number(hourRaw) || 9));
  const minute = Math.max(0, Math.min(59, Number(minuteRaw) || 0));
  const next = new Date();
  next.setUTCHours(hour, minute, 0, 0);

  if (next <= new Date()) {
    if (cadence === 'daily') next.setUTCDate(next.getUTCDate() + 1);
    else if (cadence === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCDate(next.getUTCDate() + 7);
  }

  return next;
}

function buildDefaultAutopilotRecommendations(evidence) {
  const recommendations = [];
  const sourceBreakdown = evidence.metrics.sourceBreakdown || {};
  const llmCount = sourceBreakdown.llm || 0;
  const qaCount = sourceBreakdown.qa || 0;

  if (llmCount > qaCount) {
    recommendations.push({
      priority: 'high',
      title: 'Your bot often answers from LLM instead of knowledge base',
      detail: `${llmCount} sampled answers came from LLM versus ${qaCount} from curated Q&A. Promote reliable generated answers into training data.`,
      evidence: [`LLM answers: ${llmCount}`, `Knowledge-base answers: ${qaCount}`],
      suggestedAction: 'Create training Q&A from high-frequency LLM answers.',
      channel: 'training_data',
    });
  }

  for (const item of evidence.topUnansweredQuestions.slice(0, 4)) {
    recommendations.push({
      priority: 'high',
      title: `Add docs for: ${item.question}`,
      detail: 'Users are asking this and the bot used a fallback or could not answer confidently.',
      evidence: [item.traceUrl ? `Phoenix trace: ${item.traceUrl}` : 'Local trace metric', `Source: ${item.source}`],
      suggestedAction: 'Add an approved Q&A answer, source document, or workflow branch.',
      channel: 'knowledge_gap',
    });
  }

  const handoff = evidence.handoffs;
  if (handoff.escalated > 0 || handoff.unresolved > 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Handoff should trigger earlier for difficult sessions',
      detail: `${handoff.escalated} escalated and ${handoff.unresolved} unresolved handoff sessions were found in the sample.`,
      evidence: handoff.recentQuestions.slice(0, 3).map((item) => item.question),
      suggestedAction: 'Add handoff rules for billing, refunds, account disputes, and repeated fallback turns.',
      channel: 'handoff_policy',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      title: 'Keep monitoring Phoenix traces',
      detail: 'No severe recurring issue was detected in the sampled traces. Create a weekly eval dataset to catch regressions early.',
      evidence: [`Sampled interactions: ${evidence.metrics.sampledInteractions}`],
      suggestedAction: 'Run LLM-as-a-Judge on recent low-confidence traces.',
      channel: 'monitoring',
    });
  }

  return recommendations.slice(0, 8);
}

function normalizeAutopilotRecommendations(parsed, evidence) {
  const recommendations = Array.isArray(parsed?.recommendations)
    ? parsed.recommendations
    : [];

  const clean = recommendations
    .map((item, index) => ({
      priority: ['high', 'medium', 'low'].includes(item.priority)
        ? item.priority
        : index < 2
          ? 'high'
          : 'medium',
      title: String(item.title || '').trim() || 'Improve bot performance',
      detail: String(item.detail || item.description || '').trim(),
      evidence: Array.isArray(item.evidence)
        ? item.evidence.map((entry) => String(entry)).slice(0, 5)
        : [],
      suggestedAction: String(item.suggestedAction || item.action || '').trim(),
      channel: String(item.channel || 'general').trim(),
    }))
    .filter((item) => item.title && item.detail)
    .slice(0, 10);

  return clean.length ? clean : buildDefaultAutopilotRecommendations(evidence);
}

function renderAutopilotEmail({ bot, run }) {
  const items = run.recommendations
    .map(
      (item) => `
        <li style="margin-bottom:16px">
          <strong>[${String(item.priority || 'medium').toUpperCase()}] ${item.title}</strong>
          <p style="margin:6px 0;color:#374151;line-height:1.5">${item.detail}</p>
          ${item.suggestedAction ? `<p style="margin:6px 0;color:#065f46"><strong>Next:</strong> ${item.suggestedAction}</p>` : ''}
        </li>
      `
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#111827">
      <h2 style="margin-bottom:4px">Bot Autopilot Recommendations</h2>
      <p style="margin-top:0;color:#6b7280">${bot.name} · ${run.period.cadence} report</p>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:16px 0">
        <p style="margin:0;white-space:pre-wrap">${run.summary}</p>
      </div>
      <ol style="padding-left:20px">${items}</ol>
      <p style="font-size:12px;color:#6b7280;margin-top:24px">
        Generated from Phoenix-linked traces, Q&A history, handoffs, evals, and experiments in TasteAI Studio.
      </p>
    </div>
  `;
}

function renderAutopilotSlackText({ bot, run }) {
  const lines = [
    `*Bot Autopilot Recommendations* for *${bot.name}* (${run.period.cadence})`,
    run.summary,
    '',
    ...run.recommendations.slice(0, 8).map(
      (item, index) =>
        `${index + 1}. *[${String(item.priority || 'medium').toUpperCase()}] ${item.title}*\n${item.detail}${item.suggestedAction ? `\nNext: ${item.suggestedAction}` : ''}`
    ),
  ];
  return lines.join('\n');
}

async function deliverAutopilotRun({ bot, config, run }) {
  const deliveries = [];

  if (config.delivery?.email?.enabled) {
    for (const recipient of config.delivery.email.recipients || []) {
      try {
        await sendEmail({
          to: recipient,
          subject: `Bot Autopilot Recommendations: ${bot.name}`,
          text: `${run.summary}\n\n${run.recommendations.map((item) => `- [${item.priority}] ${item.title}: ${item.detail}`).join('\n')}`,
          html: renderAutopilotEmail({ bot, run }),
        });
        deliveries.push({ channel: 'email', target: recipient, status: 'sent', sentAt: new Date() });
      } catch (error) {
        deliveries.push({ channel: 'email', target: recipient, status: 'failed', error: error.message, sentAt: new Date() });
      }
    }
  }

  if (config.delivery?.slack?.enabled && config.delivery.slack.channelId) {
    try {
      const integration = await SlackIntegration.findOne({ userId: config.user }).lean();
      if (!integration?.slackAccessToken) {
        throw new Error('Slack is not connected for this user');
      }
      await slackClient.post(
        '/chat.postMessage',
        {
          channel: config.delivery.slack.channelId,
          text: renderAutopilotSlackText({ bot, run }),
        },
        {
          headers: {
            Authorization: `Bearer ${integration.slackAccessToken}`,
          },
        }
      );
      deliveries.push({ channel: 'slack', target: config.delivery.slack.channelId, status: 'sent', sentAt: new Date() });
    } catch (error) {
      deliveries.push({ channel: 'slack', target: config.delivery.slack.channelId, status: 'failed', error: error.message, sentAt: new Date() });
    }
  }

  return deliveries;
}

exports.getBotAutopilot = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) throw new Error('Bot not found');

  let config = await BotAutopilotConfig.findOne({ bot: botId }).lean();
  if (!config) {
    const user = await User.findById(userId).lean();
    config = await BotAutopilotConfig.create({
      bot: botId,
      user: userId,
      delivery: {
        email: { enabled: true, recipients: user?.email ? [user.email] : [] },
        slack: { enabled: false, channelId: bot.slack_channel_id || '' },
      },
      nextRunAt: computeNextAutopilotRun('weekly', '09:00'),
    });
    config = config.toObject();
  }

  const runs = await BotAutopilotRun.find({ bot: botId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return {
    config,
    runs,
    phoenix: getPhoenixRuntimeInfo(),
    defaults: {
      prompt:
        'Generate practical bot improvement recommendations from Phoenix traces, Q&A history, evals, handoffs, and experiment results. Focus on training data gaps, fallback behavior, tone mismatch, prompt quality, handoff timing, and knowledge-base coverage.',
      cadence: 'weekly',
      timeOfDay: '09:00',
      timezone: 'UTC',
    },
  };
};

exports.saveBotAutopilot = async ({ botId, userId, data }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) throw new Error('Bot not found');

  const cadence = ['daily', 'weekly', 'monthly'].includes(data?.cadence)
    ? data.cadence
    : 'weekly';
  const timeOfDay = /^\d{2}:\d{2}$/.test(String(data?.timeOfDay || ''))
    ? data.timeOfDay
    : '09:00';

  const payload = {
    bot: botId,
    user: userId,
    enabled: Boolean(data?.enabled),
    prompt: String(data?.prompt || '').trim() || undefined,
    cadence,
    timeOfDay,
    timezone: String(data?.timezone || 'UTC'),
    delivery: {
      email: {
        enabled: Boolean(data?.delivery?.email?.enabled),
        recipients: normalizeEmailList(data?.delivery?.email?.recipients),
      },
      slack: {
        enabled: Boolean(data?.delivery?.slack?.enabled),
        channelId: String(data?.delivery?.slack?.channelId || '').trim(),
      },
    },
    nextRunAt: Boolean(data?.enabled) ? computeNextAutopilotRun(cadence, timeOfDay) : null,
  };

  const config = await BotAutopilotConfig.findOneAndUpdate(
    { bot: botId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return config;
};

exports.generateBotAutopilotRecommendations = async ({
  botId,
  userId,
  trigger = 'preview',
  send = false,
  promptOverride = null,
}) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) throw new Error('Bot not found');

  let config = await BotAutopilotConfig.findOne({ bot: botId }).lean();
  if (!config) {
    config = (await exports.saveBotAutopilot({ botId, userId, data: {} }));
  }

  const period = getPeriodForCadence(config.cadence);
  const [metrics, handoffs, evalRuns, experiments] = await Promise.all([
    BotInteractionMetric.find({
      bot: botId,
      createdAt: { $gte: period.from, $lte: period.to },
    }).sort({ createdAt: -1 }).limit(300).lean(),
    HandoffSession.find({
      bot: botId,
      $or: [
        { requestedAt: { $gte: period.from, $lte: period.to } },
        { createdAt: { $gte: period.from, $lte: period.to } },
      ],
    }).sort({ requestedAt: -1 }).limit(100).lean(),
    BotEvalRun.find({ bot: botId }).sort({ createdAt: -1 }).limit(10).lean(),
    BotExperiment.find({ bot: botId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const evidence = buildIntrospectionEvidence({ bot, metrics, handoffs, evalRuns, experiments });
  const prompt = String(promptOverride || config.prompt || '').trim();
  const autopilotPrompt = `
You are Bot Autopilot Recommendations for "${bot.name}".
Use Phoenix/Arize trace evidence, Q&A history, handoffs, evals, and experiments to generate recurring ${period.cadence} recommendations.

User setup prompt:
${prompt}

Look for examples like:
- Add docs for refund policy
- Bot often answers from LLM instead of knowledge base
- Users ask about pricing but training data has no pricing content
- Handoff should trigger earlier for billing disputes
- Tone mismatch detected in sessions

Evidence JSON:
${JSON.stringify(evidence, null, 2)}

Return only JSON:
{
  "summary": "short executive summary",
  "recommendations": [
    {
      "priority": "high|medium|low",
      "title": "short recommendation title",
      "detail": "why this matters",
      "evidence": ["specific trace/eval/history evidence"],
      "suggestedAction": "what the admin should do next",
      "channel": "training_data|prompt|handoff_policy|tone|knowledge_gap|eval|other"
    }
  ]
}`;

  return runPhoenixSpan(
    'bot.autopilot_recommendations',
    'CHAIN',
    {
      'bot.id': String(botId),
      'user.id': userId ? String(userId) : undefined,
      'metadata.trigger': trigger,
      'metadata.cadence': period.cadence,
      'input.value': prompt,
    },
    async (span) => {
      let summary = '';
      let recommendations;
      try {
        const llmClient = await getLLMClient(bot, userId);
        const raw = await llmClient.generateSummary(autopilotPrompt);
        const parsed = parseJudgeJson(raw) || {};
        summary = String(parsed.summary || '').trim();
        recommendations = normalizeAutopilotRecommendations(parsed, evidence);
      } catch (error) {
        recommendations = buildDefaultAutopilotRecommendations(evidence);
      }

      if (!summary) {
        summary = `${recommendations.length} recommendations generated from ${evidence.metrics.sampledInteractions} recent interactions and ${evidence.phoenix.linkedTraceCount} Phoenix-linked traces.`;
      }

      let run = await BotAutopilotRun.create({
        bot: botId,
        config: config._id,
        trigger,
        prompt,
        period,
        status: 'completed',
        summary,
        recommendations,
        evidence: {
          phoenix: evidence.phoenix,
          metrics: evidence.metrics,
          failureClusters: evidence.failureClusters,
          handoffs: evidence.handoffs,
          latestJudgeRun: evidence.evals.latestJudgeRun,
          bestExperiment: evidence.experiments.best,
        },
      });

      let deliveries = [];
      if (send) {
        deliveries = await deliverAutopilotRun({ bot, config, run: run.toObject() });
        run.deliveries = deliveries;
        await run.save();
      }

      if (trigger !== 'preview') {
        await BotAutopilotConfig.findByIdAndUpdate(config._id, {
          lastRunAt: new Date(),
          nextRunAt: config.enabled ? computeNextAutopilotRun(config.cadence, config.timeOfDay) : null,
          lastStatus: 'completed',
          lastError: null,
        });
      }

      setPhoenixSpanAttributes(span, {
        'output.value': summary,
        'metadata.recommendation_count': recommendations.length,
        'metadata.delivery_count': deliveries.length,
        'metadata.sampled_interactions': evidence.metrics.sampledInteractions,
      });

      return run.toObject();
    }
  );
};

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

exports.createEvalDatasetType = async ({ botId, userId, payload }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const name = String(payload?.name || '').trim();
  if (!name) {
    throw new Error('Eval dataset type name is required');
  }

  const record = await BotEvalDatasetType.create({
    bot: botId,
    name,
    description: String(payload?.description || '').trim(),
    polarity: ['positive', 'negative', 'neutral'].includes(payload?.polarity)
      ? payload.polarity
      : 'neutral',
    traceSource:
      payload?.traceSource === 'handoff_sessions'
        ? 'handoff_sessions'
        : 'interaction_metrics',
    traceFilters: payload?.traceFilters || {},
    handoffFilters: payload?.handoffFilters || {},
    datasetName: String(payload?.datasetName || name).trim(),
    createdBy: userId,
  });

  return record;
};

exports.listEvalDatasetTypes = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  return BotEvalDatasetType.find({ bot: botId })
    .sort({ createdAt: -1 })
    .lean();
};

exports.deleteEvalDatasetType = async ({ botId, userId, typeId }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const deleted = await BotEvalDatasetType.findOneAndDelete({
    _id: typeId,
    bot: botId,
  });

  if (!deleted) {
    throw new Error('Custom eval dataset type not found');
  }

  return { deleted: true, id: String(deleted._id) };
};

exports.buildEvalDatasetFromProduction = async ({
  botId,
  userId,
  sourceType,
  customTypeId,
}) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  let records = [];
  let resolvedSourceType = sourceType;
  let datasetName = datasetNameForSource(sourceType);
  let resolvedCustomTypeId = null;

  if (customTypeId || sourceType === 'custom' || String(sourceType).startsWith('custom:')) {
    const typeId =
      customTypeId || String(sourceType).replace(/^custom:/, '') || customTypeId;
    const customType = await BotEvalDatasetType.findOne({
      _id: typeId,
      bot: botId,
    }).lean();

    if (!customType) {
      throw new Error('Custom eval dataset type not found');
    }

    resolvedSourceType = 'custom';
    resolvedCustomTypeId = customType._id;
    datasetName = customType.datasetName || customType.name;

    if (customType.traceSource === 'handoff_sessions') {
      const handoffs = await HandoffSession.find(
        buildHandoffQueryFromFilters(botId, customType.handoffFilters || {})
      )
        .sort({ requestedAt: -1 })
        .limit(100)
        .lean();

      records = handoffs.map((handoff) =>
        handoffToDatasetRecord({
          botId,
          sourceType: 'custom',
          handoff,
          userId,
          datasetName,
          customTypeId: resolvedCustomTypeId,
        })
      );
    } else {
      const metrics = await BotInteractionMetric.find(
        buildMetricQueryFromFilters(botId, customType.traceFilters || {})
      )
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      records = metrics.map((metric) =>
        metricToDatasetRecord({
          botId,
          sourceType: 'custom',
          metric,
          userId,
          datasetName,
          customTypeId: resolvedCustomTypeId,
        })
      );
    }
  } else if (!BUILTIN_EVAL_SOURCE_TYPES.includes(sourceType)) {
    throw new Error('Invalid dataset source type');
  } else {
    const metricSources = [
      'low_confidence_traces',
      'high_confidence_traces',
      'unanswered_questions',
      'grounded_answers',
      'hallucination_risk',
      'qa_retrieval_hits',
      'slow_responses',
    ];
    const handoffSources = [
      'handoff_sessions',
      'resolved_handoffs',
      'negative_feedback',
      'positive_feedback',
    ];

    if (metricSources.includes(sourceType)) {
      const metrics = await fetchMetricsForBuiltinSource(botId, sourceType);
      records = metrics.map((metric) =>
        metricToDatasetRecord({ botId, sourceType, metric, userId })
      );
    }

    if (handoffSources.includes(sourceType)) {
      const handoffs = await fetchHandoffsForBuiltinSource(botId, sourceType);
      records = handoffs.map((handoff) =>
        handoffToDatasetRecord({ botId, sourceType, handoff, userId })
      );
    }

    datasetName = datasetNameForSource(sourceType);
  }

  const saved = await upsertDatasetItems(
    records.filter((record) => record.question && record.question.trim())
  );

  return {
    sourceType: resolvedSourceType,
    customTypeId: resolvedCustomTypeId ? String(resolvedCustomTypeId) : null,
    datasetName,
    createdCount: saved.length,
    items: saved,
  };
};

exports.getEvalDatasets = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const [items, runs, customTypes] = await Promise.all([
    BotEvalDatasetItem.find({ bot: botId }).sort({ createdAt: -1 }).limit(300).lean(),
    BotEvalRun.find({ bot: botId }).sort({ createdAt: -1 }).limit(100).lean(),
    BotEvalDatasetType.find({ bot: botId }).sort({ createdAt: -1 }).lean(),
  ]);

  const latestRunByDataset = runs.reduce((acc, run) => {
    const key = run.datasetName || 'all';
    if (!acc[key]) {
      acc[key] = run;
    }
    return acc;
  }, {});

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
  ).map((dataset) => {
    const sourceTypes = Array.from(dataset.sourceTypes);
    const polarity = inferDatasetPolarity(
      sourceTypes,
      customTypes,
      dataset.datasetName
    );
    return {
      ...dataset,
      sourceTypes,
      polarity,
      description: datasetDescriptionFor(
        sourceTypes,
        customTypes,
        dataset.datasetName
      ),
      latestRun: latestRunByDataset[dataset.datasetName] || null,
    };
  });

  const totalItems = items.length;
  const completedRuns = runs.filter((run) => run.status === 'completed');
  const averageOverallScore = averageNumbers(
    completedRuns.map((run) => run.overallScore)
  );

  return {
    datasets,
    items,
    runs,
    customTypes,
    builtinTypes: BUILTIN_EVAL_SOURCE_TYPES.map((type) => ({
      sourceType: type,
      datasetName: datasetNameForSource(type),
      polarity: SOURCE_TYPE_POLARITY[type] || 'neutral',
    })),
    judgeSummary: {
      totalDatasets: datasets.length,
      totalItems,
      totalRuns: runs.length,
      completedRuns: completedRuns.length,
      averageOverallScore,
      latestRun: runs[0] || null,
    },
    judgeConfig: {
      criteria: Object.values(JUDGE_CRITERIA),
      evalModes: [
        {
          key: 'standard',
          label: 'Standard',
          description: 'Balanced grading across all quality dimensions.',
        },
        {
          key: 'regression',
          label: 'Regression',
          description: 'Focus on failure detection for negative datasets.',
        },
        {
          key: 'gold_standard',
          label: 'Gold standard',
          description: 'Focus on quality preservation for positive datasets.',
        },
        {
          key: 'custom',
          label: 'Custom criteria',
          description: 'Grade only the criteria you select.',
        },
      ],
      defaultPassThreshold: 0.7,
      sourceTypePolarity: SOURCE_TYPE_POLARITY,
    },
  };
};

exports.runLLMJudgeForBot = async ({
  botId,
  userId,
  datasetName,
  evalMode = 'standard',
  selectedCriteria = [],
  passThreshold = 0.7,
}) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const query = { bot: botId };
  if (datasetName && datasetName !== 'all') {
    query.datasetName = datasetName;
  }

  const [items, customTypes] = await Promise.all([
    BotEvalDatasetItem.find(query).sort({ createdAt: -1 }).limit(30).lean(),
    BotEvalDatasetType.find({ bot: botId }).lean(),
  ]);

  if (!items.length) {
    throw new Error('No eval dataset items found for this bot');
  }

  const sourceTypes = [...new Set(items.map((item) => item.sourceType || item.source))];
  const polarity =
    datasetName && datasetName !== 'all'
      ? inferDatasetPolarity(sourceTypes, customTypes, datasetName)
      : inferDatasetPolarity(sourceTypes, customTypes);

  const resolvedEvalMode =
    evalMode === 'standard' && polarity === 'negative'
      ? 'regression'
      : evalMode === 'standard' && polarity === 'positive'
        ? 'gold_standard'
        : evalMode;

  const activeCriteria = resolveJudgeCriteria({
    evalMode: resolvedEvalMode,
    selectedCriteria,
  });

  const threshold = Number(passThreshold);
  const normalizedThreshold =
    Number.isFinite(threshold) && threshold > 0 && threshold <= 1 ? threshold : 0.7;

  const run = await BotEvalRun.create({
    bot: botId,
    datasetName: datasetName || 'all',
    status: 'running',
    judgeModel: bot.custom_model || 'gemini-3.1-pro-preview',
    evalMode: resolvedEvalMode,
    polarity,
    sourceTypes,
    itemCount: items.length,
    passThreshold: normalizedThreshold,
    selectedCriteria: activeCriteria,
  });

  try {
    const llmClient = await getLLMClient(bot, userId);
    const explanations = [];

    for (const item of items) {
      const prompt = buildJudgePrompt({
        bot,
        item,
        evalMode: resolvedEvalMode,
        polarity,
        activeCriteria,
      });

      const raw = await llmClient.generateSummary(prompt);
      const parsed = parseJudgeJson(raw) || {};
      const scores = parsed.scores || {};
      const normalizedScores = activeCriteria.reduce((acc, key) => {
        acc[key] = normalizeJudgeScore(scores[key]);
        return acc;
      }, {});

      const overallItemScore = averageItemScore(normalizedScores, activeCriteria);
      const verdict = itemVerdict({
        overallItemScore,
        passThreshold: normalizedThreshold,
        polarity,
      });

      explanations.push({
        itemId: item._id,
        question: item.question,
        scores: normalizedScores,
        overallItemScore,
        verdict,
        sourceType: item.sourceType || item.source || null,
        explanation: parsed.explanation || 'Judge completed without explanation.',
      });
    }

    const criteria = activeCriteria.reduce((acc, key) => {
      acc[key] =
        explanations.reduce((sum, entry) => sum + (entry.scores[key] || 0), 0) /
        explanations.length;
      return acc;
    }, {});

    const overallScore = averageNumbers(
      explanations.map((entry) => entry.overallItemScore)
    );

    const passedCount = explanations.filter((entry) => entry.verdict === 'pass').length;
    const failedCount = explanations.filter((entry) => entry.verdict === 'fail').length;
    const passRate = explanations.length ? passedCount / explanations.length : null;

    await BotEvalRun.findByIdAndUpdate(run._id, {
      status: 'completed',
      criteria,
      overallScore,
      explanations,
      passedCount,
      failedCount,
      passRate,
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

exports.getBotExperiments = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const [experiments, datasets] = await Promise.all([
    BotExperiment.find({ bot: botId }).sort({ createdAt: -1 }).lean(),
    BotEvalDatasetItem.aggregate([
      { $match: { bot: bot._id } },
      {
        $group: {
          _id: '$datasetName',
          itemCount: { $sum: 1 },
          latestItemAt: { $max: '$createdAt' },
        },
      },
      { $sort: { latestItemAt: -1 } },
    ]),
  ]);

  return {
    experiments,
    datasets: datasets.map((dataset) => ({
      datasetName: dataset._id,
      itemCount: dataset.itemCount,
      latestItemAt: dataset.latestItemAt,
    })),
    defaults: {
      control: {
        label: 'Current bot',
        description: '',
        trafficAllocation: 50,
        config: {},
      },
      treatment: {
        label: 'Treatment',
        description: '',
        trafficAllocation: 50,
        config: {},
      },
    },
  };
};

exports.createBotExperiment = async ({ botId, userId, data }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  if (!data?.name) {
    throw new Error('Experiment name is required');
  }

  const experiment = await BotExperiment.create({
    bot: botId,
    name: data.name,
    hypothesis: data.hypothesis || '',
    datasetName: data.datasetName || 'all',
    primaryMetric: data.primaryMetric || 'judge_score',
    guardrailMetric: data.guardrailMetric || 'latency',
    targetingRules: data.targetingRules || {},
    control: {
      label: data.control?.label || 'Current bot',
      description: data.control?.description || '',
      trafficAllocation: Number(data.control?.trafficAllocation ?? 50),
      config: data.control?.config || {},
    },
    treatment: {
      label: data.treatment?.label || 'Treatment',
      description: data.treatment?.description || '',
      trafficAllocation: Number(data.treatment?.trafficAllocation ?? 50),
      config: data.treatment?.config || {},
    },
    createdBy: userId,
  });

  return experiment;
};

exports.runBotExperiment = async ({ botId, userId, experimentId }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const experiment = await BotExperiment.findOne({ _id: experimentId, bot: botId });
  if (!experiment) {
    throw new Error('Experiment not found');
  }

  const datasetQuery = { bot: botId };
  if (experiment.datasetName && experiment.datasetName !== 'all') {
    datasetQuery.datasetName = experiment.datasetName;
  }

  const items = await BotEvalDatasetItem.find(datasetQuery)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  if (!items.length) {
    throw new Error('Create an eval dataset before running an experiment');
  }

  experiment.status = 'running';
  experiment.error = null;
  await experiment.save();

  try {
    const samples = [];

    for (const item of items) {
      const [control, treatment] = await Promise.all([
        generateVariantAnswer({
          bot,
          variant: experiment.control,
          item,
          userId,
        }),
        generateVariantAnswer({
          bot,
          variant: experiment.treatment,
          item,
          userId,
        }),
      ]);

      const judge = await judgeExperimentSample({
        bot,
        item,
        controlOutput: control.output,
        treatmentOutput: treatment.output,
        userId,
      });

      samples.push({
        question: item.question,
        controlOutput: control.output,
        treatmentOutput: treatment.output,
        winner: judge.winner,
        controlScore: judge.controlScore,
        treatmentScore: judge.treatmentScore,
        explanation: judge.explanation,
        controlLatencyMs: control.latencyMs,
        treatmentLatencyMs: treatment.latencyMs,
        controlEstimatedCost: control.estimatedCost,
        treatmentEstimatedCost: treatment.estimatedCost,
      });
    }

    const treatmentWins = samples.filter(
      (sample) => sample.winner === 'treatment'
    ).length;
    const controlWins = samples.filter((sample) => sample.winner === 'control')
      .length;
    const ties = samples.filter((sample) => sample.winner === 'tie').length;

    experiment.status = 'completed';
    experiment.samples = samples;
    experiment.metrics = {
      controlWins,
      treatmentWins,
      ties,
      treatmentWinRate: samples.length ? treatmentWins / samples.length : 0,
      controlAverageJudgeScore: averageNumbers(
        samples.map((sample) => sample.controlScore)
      ),
      treatmentAverageJudgeScore: averageNumbers(
        samples.map((sample) => sample.treatmentScore)
      ),
      controlAverageLatencyMs: averageNumbers(
        samples.map((sample) => sample.controlLatencyMs)
      ),
      treatmentAverageLatencyMs: averageNumbers(
        samples.map((sample) => sample.treatmentLatencyMs)
      ),
      controlEstimatedCost: samples.reduce(
        (sum, sample) => sum + (sample.controlEstimatedCost || 0),
        0
      ),
      treatmentEstimatedCost: samples.reduce(
        (sum, sample) => sum + (sample.treatmentEstimatedCost || 0),
        0
      ),
    };
    experiment.completedAt = new Date();
    await experiment.save();

    return experiment.toObject();
  } catch (error) {
    experiment.status = 'failed';
    experiment.error = error.message;
    experiment.completedAt = new Date();
    await experiment.save();
    throw error;
  }
};
