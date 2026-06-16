const mongoose = require('mongoose');

const MonitoringRuleSchema = new mongoose.Schema(
  {
    ruleKey: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    metricType: {
      type: String,
      enum: [
        'low_confidence_rate',
        'groundedness_score',
        'hallucination_risk_avg',
        'latency_avg_ms',
        'latency_p95_ms',
        'handoff_rate',
        'handoff_rate_spike',
        'fallback_rate',
        'unknown_intent_cluster_count',
        'largest_unknown_cluster',
      ],
      required: true,
    },
    operator: { type: String, enum: ['above', 'below'], default: 'above' },
    threshold: { type: Number, required: true },
    windowHours: { type: Number, default: 24 },
    minOccurrences: { type: Number, default: 2 },
    enabled: { type: Boolean, default: true },
    isBuiltin: { type: Boolean, default: false },
  },
  { _id: true },
);

const BotMonitoringConfigSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    enabled: { type: Boolean, default: true },
    checkIntervalMinutes: { type: Number, default: 15 },
    cooldownMinutes: { type: Number, default: 60 },
    notifyOnDashboard: { type: Boolean, default: true },
    delivery: {
      email: {
        enabled: { type: Boolean, default: true },
        recipients: { type: [String], default: [] },
      },
      slack: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: '' },
      },
    },
    rules: { type: [MonitoringRuleSchema], default: [] },
    lastCheckedAt: { type: Date, default: null },
    lastStatus: {
      type: String,
      enum: ['never_run', 'ok', 'alerting', 'failed'],
      default: 'never_run',
    },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BotMonitoringConfig', BotMonitoringConfigSchema);
