const mongoose = require('mongoose');

const BotImprovementActionSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },
    itemKey: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        'add_to_eval_dataset',
        'create_training_qa',
        'mark_expected',
        'send_to_human_review',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'completed', 'dismissed', 'needs_review'],
      default: 'queued',
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

BotImprovementActionSchema.index({ bot: 1, itemKey: 1, action: 1 });

module.exports = mongoose.model(
  'BotImprovementAction',
  BotImprovementActionSchema
);
