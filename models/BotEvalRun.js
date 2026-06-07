const mongoose = require('mongoose');

const BotEvalRunSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    datasetName: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
      index: true,
    },
    judgeModel: { type: String, default: 'configured-llm' },
    evalMode: {
      type: String,
      enum: ['standard', 'regression', 'gold_standard', 'custom'],
      default: 'standard',
    },
    polarity: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'mixed'],
      default: 'neutral',
    },
    sourceTypes: [{ type: String }],
    itemCount: { type: Number, default: 0 },
    passThreshold: { type: Number, default: 0.7 },
    passedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    passRate: { type: Number, default: null },
    selectedCriteria: [{ type: String }],
    criteria: {
      relevance: Number,
      helpfulness: Number,
      groundedness: Number,
      toneMatch: Number,
      instructionFollowing: Number,
      handoffCorrectness: Number,
      refusalCorrectness: Number,
      responseLengthFit: Number,
    },
    overallScore: { type: Number, default: null },
    explanations: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'BotEvalDatasetItem' },
        question: String,
        scores: { type: mongoose.Schema.Types.Mixed, default: {} },
        overallItemScore: { type: Number, default: null },
        verdict: {
          type: String,
          enum: ['pass', 'fail', 'review'],
          default: 'review',
        },
        sourceType: { type: String, default: null },
        explanation: String,
      },
    ],
    error: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BotEvalRunSchema.index({ bot: 1, createdAt: -1 });

module.exports = mongoose.model('BotEvalRun', BotEvalRunSchema);
