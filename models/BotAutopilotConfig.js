const mongoose = require('mongoose');

const BotAutopilotConfigSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    enabled: { type: Boolean, default: false },
    prompt: {
      type: String,
      default:
        'Generate practical bot improvement recommendations from Phoenix traces, Q&A history, evals, handoffs, and experiment results. Focus on training data gaps, fallback behavior, tone mismatch, prompt quality, handoff timing, and knowledge-base coverage.',
    },
    cadence: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
    },
    timeOfDay: { type: String, default: '09:00' },
    timezone: { type: String, default: 'UTC' },
    delivery: {
      email: { enabled: { type: Boolean, default: true }, recipients: { type: [String], default: [] } },
      slack: { enabled: { type: Boolean, default: false }, channelId: { type: String, default: '' } },
    },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null, index: true },
    lastStatus: {
      type: String,
      enum: ['never_run', 'completed', 'failed'],
      default: 'never_run',
    },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BotAutopilotConfig', BotAutopilotConfigSchema);
