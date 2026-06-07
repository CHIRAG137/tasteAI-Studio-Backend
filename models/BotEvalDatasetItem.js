const mongoose = require('mongoose');

const BotEvalDatasetItemSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    itemKey: { type: String, required: true, index: true },
    datasetName: { type: String, default: 'Default Eval Dataset', index: true },
    sourceType: {
      type: String,
      enum: [
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
        'self_improvement',
        'custom',
      ],
      default: 'self_improvement',
      index: true,
    },
    customTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotEvalDatasetType',
      default: null,
      index: true,
    },
    question: { type: String, required: true },
    expectedAnswer: { type: String, default: '' },
    actualAnswer: { type: String, default: '' },
    source: { type: String, default: 'self_improvement' },
    evals: {
      relevance: { type: Boolean, default: true },
      groundedness: { type: Boolean, default: true },
      helpfulness: { type: Boolean, default: true },
      tone: { type: Boolean, default: true },
    },
    phoenixDatasetId: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

BotEvalDatasetItemSchema.index({ bot: 1, itemKey: 1 }, { unique: true });
BotEvalDatasetItemSchema.index({ bot: 1, createdAt: -1 });

module.exports = mongoose.model('BotEvalDatasetItem', BotEvalDatasetItemSchema);
