const ChatBot = require('../models/ChatBot');
const FlowSession = require('../models/FlowSession');
const QAHistory = require('../models/QAHistory');
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

function buildRecommendations({
  lowConfidenceQuestions,
  sourceBreakdown,
  totalQa,
}) {
  const recommendations = [];

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

  const sessionQa = sessions.flatMap(flattenSessionQa);
  const scoreValues = sessionQa
    .map((item) => item.score)
    .filter((score) => typeof score === 'number' && Number.isFinite(score));

  const averageConfidence = scoreValues.length
    ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    : null;

  const lowConfidenceQuestions = sessionQa
    .filter((item) => item.score === null || item.score < 0.85)
    .slice(0, 10);

  const sourceBreakdown = recentQa.reduce((acc, item) => {
    const source = item.source || 'llm';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

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
    lowConfidenceQuestions,
    recommendations: buildRecommendations({
      lowConfidenceQuestions,
      sourceBreakdown,
      totalQa,
    }),
    selfImprovementLoop: [
      'Trace every bot answer into Phoenix with bot, session, source, score, and prompt attributes.',
      'Use Phoenix MCP to pull recent low-confidence traces and create a dataset.',
      'Run LLM-as-a-judge evals for relevance, groundedness, tone, and handoff correctness.',
      'Promote winning prompt or training-data changes only after experiment scores improve.',
    ],
  };
};
