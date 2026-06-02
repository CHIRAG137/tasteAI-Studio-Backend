const mongoose = require('mongoose');

const VariantConfigSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    description: { type: String, default: '' },
    trafficAllocation: { type: Number, default: 50 },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const BotExperimentSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    hypothesis: { type: String, default: '' },
    datasetName: { type: String, default: 'all' },
    primaryMetric: { type: String, default: 'judge_score' },
    guardrailMetric: { type: String, default: 'latency' },
    targetingRules: { type: mongoose.Schema.Types.Mixed, default: {} },
    control: { type: VariantConfigSchema, required: true },
    treatment: { type: VariantConfigSchema, required: true },
    status: {
      type: String,
      enum: ['draft', 'running', 'completed', 'failed'],
      default: 'draft',
      index: true,
    },
    metrics: {
      controlWins: { type: Number, default: 0 },
      treatmentWins: { type: Number, default: 0 },
      ties: { type: Number, default: 0 },
      treatmentWinRate: { type: Number, default: null },
      controlAverageJudgeScore: { type: Number, default: null },
      treatmentAverageJudgeScore: { type: Number, default: null },
      controlAverageLatencyMs: { type: Number, default: null },
      treatmentAverageLatencyMs: { type: Number, default: null },
      controlEstimatedCost: { type: Number, default: null },
      treatmentEstimatedCost: { type: Number, default: null },
    },
    samples: [
      {
        question: String,
        controlOutput: String,
        treatmentOutput: String,
        winner: {
          type: String,
          enum: ['control', 'treatment', 'tie'],
        },
        controlScore: Number,
        treatmentScore: Number,
        explanation: String,
        controlLatencyMs: Number,
        treatmentLatencyMs: Number,
      },
    ],
    error: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BotExperimentSchema.index({ bot: 1, createdAt: -1 });

module.exports = mongoose.model('BotExperiment', BotExperimentSchema);
