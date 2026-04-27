const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    slackTeamId: { type: String },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['approval', 'triage', 'form', 'custom'],
      default: 'custom',
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused'],
      default: 'draft',
    },
    triggerType: { type: String, default: 'slash_command' },
    triggerValue: { type: String, required: true },
    channel: { type: String, default: '' },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    runs: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Workflow', workflowSchema);
