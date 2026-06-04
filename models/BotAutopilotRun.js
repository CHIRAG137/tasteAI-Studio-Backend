const mongoose = require('mongoose');

const BotAutopilotRunSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    config: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotAutopilotConfig',
      default: null,
      index: true,
    },
    trigger: {
      type: String,
      enum: ['preview', 'manual', 'scheduled'],
      default: 'manual',
      index: true,
    },
    prompt: { type: String, default: '' },
    period: {
      from: { type: Date, default: null },
      to: { type: Date, default: null },
      cadence: { type: String, default: 'weekly' },
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
      index: true,
    },
    recommendations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    summary: { type: String, default: '' },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
    deliveries: { type: [mongoose.Schema.Types.Mixed], default: [] },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

BotAutopilotRunSchema.index({ bot: 1, createdAt: -1 });

module.exports = mongoose.model('BotAutopilotRun', BotAutopilotRunSchema);
