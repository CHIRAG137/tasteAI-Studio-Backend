const mongoose = require('mongoose');

const TraceFiltersSchema = new mongoose.Schema(
  {
    confidenceMin: { type: Number, default: null },
    confidenceMax: { type: Number, default: null },
    hallucinationRiskMin: { type: Number, default: null },
    hallucinationRiskMax: { type: Number, default: null },
    groundednessScoreMin: { type: Number, default: null },
    groundednessScoreMax: { type: Number, default: null },
    usedFallback: { type: Boolean, default: null },
    sources: [{ type: String }],
    userEmotions: [{ type: String }],
    latencyMsMin: { type: Number, default: null },
    latencyMsMax: { type: Number, default: null },
    retrievalScoreMin: { type: Number, default: null },
  },
  { _id: false },
);

const HandoffFiltersSchema = new mongoose.Schema(
  {
    statuses: [{ type: String }],
    escalated: { type: Boolean, default: null },
    userRatingMin: { type: Number, default: null },
    userRatingMax: { type: Number, default: null },
    hasFeedback: { type: Boolean, default: null },
  },
  { _id: false },
);

const BotEvalDatasetTypeSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    polarity: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral',
      index: true,
    },
    traceSource: {
      type: String,
      enum: ['interaction_metrics', 'handoff_sessions'],
      default: 'interaction_metrics',
    },
    traceFilters: { type: TraceFiltersSchema, default: () => ({}) },
    handoffFilters: { type: HandoffFiltersSchema, default: () => ({}) },
    datasetName: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

BotEvalDatasetTypeSchema.index({ bot: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('BotEvalDatasetType', BotEvalDatasetTypeSchema);
