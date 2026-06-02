const mongoose = require('mongoose');

const BotInteractionMetricSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    flowSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlowSession',
      default: null,
      index: true,
    },
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
    source: { type: String, default: 'unknown', index: true },
    confidence: { type: Number, default: null },
    latencyMs: { type: Number, default: null },
    usedFallback: { type: Boolean, default: false, index: true },
    groundednessScore: { type: Number, default: null },
    hallucinationRisk: { type: Number, default: null },
    userEmotion: { type: String, default: 'neutral' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

BotInteractionMetricSchema.index({ bot: 1, createdAt: -1 });
BotInteractionMetricSchema.index({ bot: 1, confidence: 1 });

module.exports = mongoose.model(
  'BotInteractionMetric',
  BotInteractionMetricSchema
);
