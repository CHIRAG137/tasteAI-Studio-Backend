const mongoose = require('mongoose');

const BotMonitoringAlertSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    ruleKey: { type: String, required: true, index: true },
    ruleName: { type: String, required: true },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'warning',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'acknowledged'],
      default: 'active',
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    metricType: { type: String, required: true },
    operator: { type: String, default: 'above' },
    threshold: { type: Number, required: true },
    currentValue: { type: Number, default: null },
    windowHours: { type: Number, default: 24 },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    notifications: {
      type: [
        {
          channel: String,
          target: String,
          status: String,
          error: String,
          sentAt: Date,
        },
      ],
      default: [],
    },
    triggeredAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BotMonitoringAlertSchema.index({ bot: 1, status: 1, triggeredAt: -1 });
BotMonitoringAlertSchema.index({ bot: 1, ruleKey: 1, triggeredAt: -1 });

module.exports = mongoose.model('BotMonitoringAlert', BotMonitoringAlertSchema);
