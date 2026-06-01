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
