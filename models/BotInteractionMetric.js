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
    
    // Detailed trace information for timeline visualization
    trace: {
      embeddingGeneration: {
        durationMs: { type: Number, default: null },
        provider: { type: String, default: null },
        model: { type: String, default: null },
      },
      retrieval: {
        durationMs: { type: Number, default: null },
        totalQAsSearched: { type: Number, default: null },
        matchedQAId: { type: mongoose.Schema.Types.ObjectId, ref: 'QAHistory', default: null },
        matchedQuestion: { type: String, default: null },
        matchedAnswer: { type: String, default: null },
        retrievalScore: { type: Number, default: null },
        retrievalThreshold: { type: Number, default: 0.85 },
      },
      fallback: {
        used: { type: Boolean, default: false },
        source: {
          type: String,
          enum: ['qa', 'dataset', 'spreadsheet', 'llm', 'none', 'unknown'],
          default: 'unknown',
        },
        sourceDescription: { type: String, default: null },
      },
      promptGeneration: {
        durationMs: { type: Number, default: null },
        finalPromptLength: { type: Number, default: null },
        finalPrompt: { type: String, default: null },
      },
      answerGeneration: {
        durationMs: { type: Number, default: null },
        llmProvider: { type: String, default: null },
        llmModel: { type: String, default: null },
      },
      totalDurationMs: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

BotInteractionMetricSchema.index({ bot: 1, createdAt: -1 });
BotInteractionMetricSchema.index({ bot: 1, confidence: 1 });

module.exports = mongoose.model(
  'BotInteractionMetric',
  BotInteractionMetricSchema
);
