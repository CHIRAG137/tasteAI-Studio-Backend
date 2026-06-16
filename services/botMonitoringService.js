const ChatBot = require('../models/ChatBot');
const User = require('../models/User');
const BotInteractionMetric = require('../models/BotInteractionMetric');
const HandoffSession = require('../models/HandoffSession');
const BotMonitoringConfig = require('../models/BotMonitoringConfig');
const BotMonitoringAlert = require('../models/BotMonitoringAlert');
const SlackIntegration = require('../models/SlackIntegration');
const sendEmail = require('../utils/sendEmailUtil');
const slackClient = require('../config/slackClient');
const { getPhoenixRuntimeInfo } = require('../config/phoenixTracing');

const BUILTIN_MONITORING_RULES = [
  {
    ruleKey: 'builtin:low_confidence_rate',
    name: 'Low confidence rate',
    description: 'Alert when more than 25% of answers have weak retrieval confidence.',
    metricType: 'low_confidence_rate',
    operator: 'above',
    threshold: 0.25,
    windowHours: 24,
    enabled: true,
    isBuiltin: true,
  },
  {
    ruleKey: 'builtin:groundedness_score',
    name: 'Grounding / hallucination risk',
    description: 'Alert when average groundedness score drops below 0.7.',
    metricType: 'groundedness_score',
    operator: 'below',
    threshold: 0.7,
    windowHours: 24,
    enabled: true,
    isBuiltin: true,
  },
  {
    ruleKey: 'builtin:latency_avg_ms',
    name: 'High latency',
    description: 'Alert when average response latency exceeds 8 seconds.',
    metricType: 'latency_avg_ms',
    operator: 'above',
    threshold: 8000,
    windowHours: 24,
    enabled: true,
    isBuiltin: true,
  },
  {
    ruleKey: 'builtin:handoff_rate_spike',
    name: 'Handoff rate spike',
    description: 'Alert when handoffs spike compared to the previous window.',
    metricType: 'handoff_rate_spike',
    operator: 'above',
    threshold: 1.5,
    windowHours: 24,
    enabled: true,
    isBuiltin: true,
  },
  {
    ruleKey: 'builtin:unknown_intent_cluster',
    name: 'Unknown intent cluster',
    description: 'Alert when a new repeated unknown intent cluster appears.',
    metricType: 'largest_unknown_cluster',
    operator: 'above',
    threshold: 2,
    windowHours: 24,
    minOccurrences: 2,
    enabled: true,
    isBuiltin: true,
  },
];

const METRIC_LABELS = {
  low_confidence_rate: 'Low confidence rate',
  groundedness_score: 'Groundedness score',
  hallucination_risk_avg: 'Hallucination risk (avg)',
  latency_avg_ms: 'Average latency (ms)',
  latency_p95_ms: 'P95 latency (ms)',
  handoff_rate: 'Handoff rate',
  handoff_rate_spike: 'Handoff spike ratio',
  fallback_rate: 'Fallback rate',
  unknown_intent_cluster_count: 'Unknown intent clusters',
  largest_unknown_cluster: 'Largest unknown cluster size',
};

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function average(values) {
  const clean = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!clean.length) {
    return null;
  }
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function percentile(values, p) {
  const clean = values
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!clean.length) {
    return null;
  }
  const index = Math.min(clean.length - 1, Math.ceil((p / 100) * clean.length) - 1);
  return clean[Math.max(0, index)];
}

function normalizeEmailList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildIntentClusters(metrics, minOccurrences = 2) {
  const buckets = {};

  for (const metric of metrics) {
    const key = normalizeKey(metric.question).split('-').slice(0, 5).join('-');
    if (!key) {
      continue;
    }
    if (!buckets[key]) {
      buckets[key] = { intentKey: key, count: 0, examples: [] };
    }
    buckets[key].count += 1;
    if (buckets[key].examples.length < 3) {
      buckets[key].examples.push({
        question: metric.question,
        source: metric.source,
        confidence: metric.confidence,
        traceUrl: metric.phoenix?.traceUrl || null,
      });
    }
  }

  return Object.values(buckets)
    .filter((bucket) => bucket.count >= minOccurrences)
    .sort((a, b) => b.count - a.count);
}

function filterByWindow(items, since, until = new Date()) {
  return items.filter((item) => {
    const ts = new Date(item.createdAt || item.requestedAt || item.updatedAt);
    return ts >= since && ts <= until;
  });
}

function computeMonitoringSnapshot(metrics, handoffs, windowHours = 24) {
  const now = new Date();
  const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - windowHours * 60 * 60 * 1000);

  const windowMetrics = filterByWindow(metrics, since, now);
  const prevMetrics = filterByWindow(metrics, prevSince, since);
  const windowHandoffs = filterByWindow(handoffs, since, now);
  const prevHandoffs = filterByWindow(handoffs, prevSince, since);

  const total = windowMetrics.length;
  const lowConfidenceCount = windowMetrics.filter(
    (metric) => typeof metric.confidence !== 'number' || metric.confidence < 0.85,
  ).length;
  const fallbackCount = windowMetrics.filter((metric) => metric.usedFallback).length;

  const clusters = buildIntentClusters(windowMetrics, 2);
  const prevClusters = buildIntentClusters(prevMetrics, 2);
  const newClusterKeys = clusters
    .map((cluster) => cluster.intentKey)
    .filter((key) => !prevClusters.some((item) => item.intentKey === key));

  const windowHandoffRate = total ? windowHandoffs.length / total : 0;
  const prevHandoffRate = prevMetrics.length ? prevHandoffs.length / prevMetrics.length : 0;
  const handoffSpikeRatio =
    prevHandoffs.length > 0
      ? windowHandoffs.length / prevHandoffs.length
      : windowHandoffs.length > 0
        ? 2
        : 0;

  return {
    windowHours,
    sampledInteractions: total,
    sampledHandoffs: windowHandoffs.length,
    low_confidence_rate: total ? lowConfidenceCount / total : 0,
    groundedness_score: average(windowMetrics.map((metric) => metric.groundednessScore)),
    hallucination_risk_avg: average(windowMetrics.map((metric) => metric.hallucinationRisk)),
    latency_avg_ms: average(windowMetrics.map((metric) => metric.latencyMs)),
    latency_p95_ms: percentile(
      windowMetrics.map((metric) => metric.latencyMs),
      95,
    ),
    handoff_rate: windowHandoffRate,
    handoff_rate_spike: handoffSpikeRatio,
    fallback_rate: total ? fallbackCount / total : 0,
    unknown_intent_cluster_count: clusters.length,
    largest_unknown_cluster: clusters[0]?.count || 0,
    clusters: clusters.slice(0, 5),
    newIntentClusters: clusters.filter((cluster) => newClusterKeys.includes(cluster.intentKey)),
    phoenixLinkedTraces: windowMetrics.filter((metric) => metric.phoenix?.traceId).length,
  };
}

function severityForRule(rule, currentValue) {
  if (rule.metricType === 'low_confidence_rate' && currentValue >= 0.4) {
    return 'critical';
  }
  if (rule.metricType === 'latency_avg_ms' && currentValue >= 12000) {
    return 'critical';
  }
  if (rule.metricType === 'groundedness_score' && currentValue < 0.5) {
    return 'critical';
  }
  return 'warning';
}

function formatMetricValue(metricType, value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  if (metricType.includes('rate') && !metricType.includes('ms')) {
    return `${Math.round(value * 100)}%`;
  }
  if (metricType.includes('ms')) {
    return `${Math.round(value)} ms`;
  }
  if (metricType.includes('score') || metricType.includes('risk')) {
    return value.toFixed(2);
  }
  if (metricType === 'handoff_rate_spike') {
    return `${value.toFixed(2)}x`;
  }
  return String(Math.round(value * 100) / 100);
}

function evaluateRule(rule, snapshot) {
  const value = snapshot[rule.metricType];
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { triggered: false, currentValue: null };
  }

  const triggered = rule.operator === 'above' ? value > rule.threshold : value < rule.threshold;

  return { triggered, currentValue: value };
}

function buildAlertPayload(rule, snapshot, evaluation) {
  const metricLabel = METRIC_LABELS[rule.metricType] || rule.metricType;
  const current = formatMetricValue(rule.metricType, evaluation.currentValue);
  const threshold = formatMetricValue(rule.metricType, rule.threshold);

  const evidence = {
    metricType: rule.metricType,
    windowHours: rule.windowHours,
    sampledInteractions: snapshot.sampledInteractions,
    phoenixLinkedTraces: snapshot.phoenixLinkedTraces,
  };

  if (
    rule.metricType === 'largest_unknown_cluster' ||
    rule.metricType === 'unknown_intent_cluster_count'
  ) {
    evidence.clusters = snapshot.newIntentClusters.length
      ? snapshot.newIntentClusters
      : snapshot.clusters.slice(0, 3);
  }

  return {
    ruleKey: rule.ruleKey,
    ruleName: rule.name,
    severity: severityForRule(rule, evaluation.currentValue),
    title: `${rule.name} threshold breached`,
    message: `${metricLabel} is ${current} (${rule.operator} ${threshold}) over the last ${rule.windowHours}h window.`,
    metricType: rule.metricType,
    operator: rule.operator,
    threshold: rule.threshold,
    currentValue: evaluation.currentValue,
    windowHours: rule.windowHours,
    evidence,
  };
}

function renderMonitoringEmail({ bot, alerts }) {
  const items = alerts
    .map(
      (alert) => `
      <li style="margin-bottom:14px">
        <strong>[${alert.severity.toUpperCase()}] ${alert.title}</strong>
        <p style="margin:6px 0;color:#374151">${alert.message}</p>
      </li>
    `,
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#111827">
      <h2>Production Monitoring Alert</h2>
      <p style="color:#6b7280">${bot.name} · ${alerts.length} active threshold breach(es)</p>
      <ul style="padding-left:18px">${items}</ul>
      <p style="font-size:12px;color:#6b7280">Generated from Phoenix-linked traces and production interaction metrics.</p>
    </div>
  `;
}

function renderMonitoringSlack({ bot, alerts }) {
  return [
    `*Production Monitoring Alert* for *${bot.name}*`,
    ...alerts.map(
      (alert, index) =>
        `${index + 1}. *[${alert.severity.toUpperCase()}] ${alert.title}*\n${alert.message}`,
    ),
  ].join('\n');
}

async function deliverMonitoringAlerts({ bot, config, alerts }) {
  const deliveries = [];

  if (config.delivery?.email?.enabled) {
    for (const recipient of config.delivery.email.recipients || []) {
      try {
        await sendEmail({
          to: recipient,
          subject: `Monitoring alert: ${bot.name} (${alerts.length} breach${alerts.length === 1 ? '' : 'es'})`,
          text: alerts
            .map((alert) => `- [${alert.severity}] ${alert.title}: ${alert.message}`)
            .join('\n'),
          html: renderMonitoringEmail({ bot, alerts }),
        });
        deliveries.push({
          channel: 'email',
          target: recipient,
          status: 'sent',
          sentAt: new Date(),
        });
      } catch (error) {
        deliveries.push({
          channel: 'email',
          target: recipient,
          status: 'failed',
          error: error.message,
          sentAt: new Date(),
        });
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
          text: renderMonitoringSlack({ bot, alerts }),
        },
        { headers: { Authorization: `Bearer ${integration.slackAccessToken}` } },
      );
      deliveries.push({
        channel: 'slack',
        target: config.delivery.slack.channelId,
        status: 'sent',
        sentAt: new Date(),
      });
    } catch (error) {
      deliveries.push({
        channel: 'slack',
        target: config.delivery.slack.channelId,
        status: 'failed',
        error: error.message,
        sentAt: new Date(),
      });
    }
  }

  return deliveries;
}

function mergeRules(existingRules = []) {
  const map = new Map();
  for (const rule of BUILTIN_MONITORING_RULES) {
    map.set(rule.ruleKey, { ...rule });
  }
  for (const rule of existingRules) {
    map.set(rule.ruleKey, { ...map.get(rule.ruleKey), ...rule });
  }
  return Array.from(map.values());
}

exports.getBotMonitoring = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  let config = await BotMonitoringConfig.findOne({ bot: botId }).lean();
  if (!config) {
    const user = await User.findById(userId).lean();
    config = await BotMonitoringConfig.create({
      bot: botId,
      user: userId,
      rules: BUILTIN_MONITORING_RULES,
      delivery: {
        email: { enabled: true, recipients: user?.email ? [user.email] : [] },
        slack: { enabled: false, channelId: bot.slack_channel_id || '' },
      },
    });
    config = config.toObject();
  } else {
    config.rules = mergeRules(config.rules);
  }

  const [metrics, handoffs, activeAlerts, recentAlerts] = await Promise.all([
    BotInteractionMetric.find({ bot: botId }).sort({ createdAt: -1 }).limit(400).lean(),
    HandoffSession.find({ bot: botId }).sort({ requestedAt: -1 }).limit(150).lean(),
    BotMonitoringAlert.find({ bot: botId, status: 'active' })
      .sort({ triggeredAt: -1 })
      .limit(50)
      .lean(),
    BotMonitoringAlert.find({ bot: botId }).sort({ triggeredAt: -1 }).limit(30).lean(),
  ]);

  const snapshot = computeMonitoringSnapshot(metrics, handoffs, 24);
  const rulePreviews = (config.rules || [])
    .filter((rule) => rule.enabled)
    .map((rule) => {
      const evaluation = evaluateRule(rule, snapshot);
      return {
        ruleKey: rule.ruleKey,
        name: rule.name,
        metricType: rule.metricType,
        operator: rule.operator,
        threshold: rule.threshold,
        currentValue: evaluation.currentValue,
        wouldTrigger: evaluation.triggered,
        formattedCurrent: formatMetricValue(rule.metricType, evaluation.currentValue),
        formattedThreshold: formatMetricValue(rule.metricType, rule.threshold),
      };
    });

  return {
    config: { ...config, rules: mergeRules(config.rules) },
    snapshot,
    rulePreviews,
    activeAlerts,
    recentAlerts,
    phoenix: getPhoenixRuntimeInfo(),
    metricCatalog: Object.entries(METRIC_LABELS).map(([key, label]) => ({
      metricType: key,
      label,
    })),
    builtinRules: BUILTIN_MONITORING_RULES,
  };
};

exports.saveBotMonitoring = async ({ botId, userId, data }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const existing = await BotMonitoringConfig.findOne({ bot: botId }).lean();
  const mergedRules = data?.rules
    ? mergeRules(data.rules)
    : mergeRules(existing?.rules || BUILTIN_MONITORING_RULES);

  const payload = {
    bot: botId,
    user: userId,
    enabled: data?.enabled !== undefined ? Boolean(data.enabled) : (existing?.enabled ?? true),
    checkIntervalMinutes:
      Number(data?.checkIntervalMinutes) || existing?.checkIntervalMinutes || 15,
    cooldownMinutes: Number(data?.cooldownMinutes) || existing?.cooldownMinutes || 60,
    notifyOnDashboard:
      data?.notifyOnDashboard !== undefined
        ? Boolean(data.notifyOnDashboard)
        : (existing?.notifyOnDashboard ?? true),
    rules: mergedRules,
    delivery: {
      email: {
        enabled: Boolean(
          data?.delivery?.email?.enabled ?? existing?.delivery?.email?.enabled ?? true,
        ),
        recipients: normalizeEmailList(
          data?.delivery?.email?.recipients ?? existing?.delivery?.email?.recipients,
        ),
      },
      slack: {
        enabled: Boolean(
          data?.delivery?.slack?.enabled ?? existing?.delivery?.slack?.enabled ?? false,
        ),
        channelId: String(
          data?.delivery?.slack?.channelId ?? existing?.delivery?.slack?.channelId ?? '',
        ).trim(),
      },
    },
  };

  const config = await BotMonitoringConfig.findOneAndUpdate({ bot: botId }, payload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  }).lean();

  return config;
};

exports.evaluateBotMonitoring = async ({ botId, userId, notify = false, trigger = 'manual' }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  let config = await BotMonitoringConfig.findOne({ bot: botId }).lean();
  if (!config) {
    config = await exports.saveBotMonitoring({ botId, userId, data: {} });
  }
  config.rules = mergeRules(config.rules);

  const [metrics, handoffs] = await Promise.all([
    BotInteractionMetric.find({ bot: botId }).sort({ createdAt: -1 }).limit(400).lean(),
    HandoffSession.find({ bot: botId }).sort({ requestedAt: -1 }).limit(150).lean(),
  ]);

  const triggeredAlerts = [];
  const cooldownMs = (config.cooldownMinutes || 60) * 60 * 1000;

  for (const rule of config.rules.filter((item) => item.enabled)) {
    const snapshot = computeMonitoringSnapshot(metrics, handoffs, rule.windowHours || 24);
    const evaluation = evaluateRule(rule, snapshot);
    if (!evaluation.triggered) {
      continue;
    }

    const recent = await BotMonitoringAlert.findOne({
      bot: botId,
      ruleKey: rule.ruleKey,
      status: 'active',
      triggeredAt: { $gte: new Date(Date.now() - cooldownMs) },
    }).lean();

    if (recent) {
      continue;
    }

    const payload = buildAlertPayload(rule, snapshot, evaluation);
    const alert = await BotMonitoringAlert.create({
      bot: botId,
      ...payload,
      status: 'active',
    });
    triggeredAlerts.push(alert.toObject());
  }

  let deliveries = [];
  if (notify && triggeredAlerts.length > 0) {
    deliveries = await deliverMonitoringAlerts({
      bot,
      config,
      alerts: triggeredAlerts,
    });
    await BotMonitoringAlert.updateMany(
      { _id: { $in: triggeredAlerts.map((alert) => alert._id) } },
      { $set: { notifications: deliveries } },
    );
  }

  const activeCount = await BotMonitoringAlert.countDocuments({
    bot: botId,
    status: 'active',
  });

  await BotMonitoringConfig.findOneAndUpdate(
    { bot: botId },
    {
      lastCheckedAt: new Date(),
      lastStatus: triggeredAlerts.length ? 'alerting' : 'ok',
      lastError: null,
    },
  );

  const snapshot = computeMonitoringSnapshot(metrics, handoffs, 24);

  return {
    trigger,
    triggeredCount: triggeredAlerts.length,
    activeAlertCount: activeCount,
    triggeredAlerts,
    deliveries,
    snapshot,
  };
};

exports.acknowledgeMonitoringAlert = async ({ botId, userId, alertId }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const alert = await BotMonitoringAlert.findOneAndUpdate(
    { _id: alertId, bot: botId },
    { status: 'acknowledged', acknowledgedAt: new Date() },
    { new: true },
  ).lean();

  if (!alert) {
    throw new Error('Alert not found');
  }
  return alert;
};

exports.resolveMonitoringAlert = async ({ botId, userId, alertId }) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId }).lean();
  if (!bot) {
    throw new Error('Bot not found');
  }

  const alert = await BotMonitoringAlert.findOneAndUpdate(
    { _id: alertId, bot: botId },
    { status: 'resolved', resolvedAt: new Date() },
    { new: true },
  ).lean();

  if (!alert) {
    throw new Error('Alert not found');
  }
  return alert;
};
