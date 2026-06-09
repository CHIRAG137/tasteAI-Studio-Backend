const mongoose = require('mongoose');

const BotSelfIntrospectionRunSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: {
      linkedTraceCount: { type: Number, default: 0 },
      sampledInteractions: { type: Number, default: 0 },
      lowConfidenceCount: { type: Number, default: 0 },
      unansweredCount: { type: Number, default: 0 },
      fallbackRate: { type: Number, default: null },
      failureClusterCount: { type: Number, default: 0 },
      phoenixProjectName: { type: String, default: null },
    },
  },
  { timestamps: true }
);

BotSelfIntrospectionRunSchema.index({ bot: 1, createdAt: -1 });

module.exports = mongoose.model('BotSelfIntrospectionRun', BotSelfIntrospectionRunSchema);
